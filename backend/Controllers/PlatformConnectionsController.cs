using Microsoft.AspNetCore.Mvc;
using SocialMarketingApi.Data;
using SocialMarketingApi.Models;
using Microsoft.EntityFrameworkCore;

namespace SocialMarketingApi.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class PlatformConnectionsController : ControllerBase
    {
        private readonly SocialMarketingContext _context;
        private readonly ILogger<PlatformConnectionsController> _logger;
        private readonly SocialMarketingApi.Services.PlatformValidationService _validationService;

        public PlatformConnectionsController(
            SocialMarketingContext context,
            ILogger<PlatformConnectionsController> logger,
            SocialMarketingApi.Services.PlatformValidationService validationService)
        {
            _context = context;
            _logger = logger;
            _validationService = validationService;
        }

        /// <summary>
        /// Get all platform connections for a user
        /// </summary>
        [HttpGet("user/{userId}")]
        public async Task<ActionResult<IEnumerable<PlatformConnectionDto>>> GetUserConnections(string userId)
        {
            try
            {
                var connections = await _context.PlatformConnections
                    .Where(pc => pc.UserId == Guid.Parse(userId))
                    .Select(pc => new PlatformConnectionDto
                    {
                        Id = pc.Id,
                        PlatformName = pc.PlatformName,
                        IsConnected = pc.IsConnected,
                        TokenExpiresAt = pc.TokenExpiresAt,
                        CreatedAt = pc.CreatedAt
                    })
                    .ToListAsync();

                return Ok(connections);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error fetching platform connections for user {UserId}", userId);
                return StatusCode(500, new { error = "Failed to fetch platform connections" });
            }
        }

        /// <summary>
        /// Get a specific platform connection
        /// </summary>
        [HttpGet("{id}")]
        public async Task<ActionResult<PlatformConnectionDto>> GetConnection(string id)
        {
            try
            {
                var connection = await _context.PlatformConnections.FindAsync(Guid.Parse(id));
                if (connection == null)
                    return NotFound();

                var dto = new PlatformConnectionDto
                {
                    Id = connection.Id,
                    PlatformName = connection.PlatformName,
                    IsConnected = connection.IsConnected,
                    TokenExpiresAt = connection.TokenExpiresAt,
                    CreatedAt = connection.CreatedAt
                };

                return Ok(dto);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error fetching platform connection {Id}", id);
                return StatusCode(500, new { error = "Failed to fetch platform connection" });
            }
        }

        /// <summary>
        /// Store OAuth token after successful authentication
        /// </summary>
        [HttpPost("authenticate")]
        public async Task<ActionResult<CreateConnectionResponse>> AuthenticatePlatform(
            [FromBody] AuthenticatePlatformRequest request)
        {
            try
            {
                if (string.IsNullOrEmpty(request.Platform) || string.IsNullOrEmpty(request.AccessToken))
                {
                    return BadRequest(new { error = "Platform and AccessToken are required" });
                }

                // Validate the token with the platform API
                var (isValid, errorMessage) = await _validationService.ValidateTokenAsync(request.Platform, request.AccessToken);
                if (!isValid)
                {
                    return BadRequest(new { error = errorMessage ?? "Invalid access token." });
                }

                var existingConnection = await _context.PlatformConnections
                    .FirstOrDefaultAsync(pc =>
                        pc.UserId == request.UserId &&
                        pc.PlatformName == request.Platform);

                PlatformConnection connection;

                if (existingConnection != null)
                {
                    existingConnection.AccessToken = request.AccessToken;
                    existingConnection.RefreshToken = request.RefreshToken;
                    existingConnection.TokenExpiresAt = request.TokenExpiresAt;
                    existingConnection.IsConnected = true;
                    _context.PlatformConnections.Update(existingConnection);
                    connection = existingConnection;
                }
                else
                {
                    connection = new PlatformConnection
                    {
                        UserId = request.UserId,
                        PlatformName = request.Platform,
                        AccessToken = request.AccessToken,
                        RefreshToken = request.RefreshToken,
                        TokenExpiresAt = request.TokenExpiresAt,
                        IsConnected = true
                    };
                    _context.PlatformConnections.Add(connection);
                }

                await _context.SaveChangesAsync();

                return Ok(new CreateConnectionResponse
                {
                    Id = connection.Id,
                    Message = $"Successfully connected to {request.Platform}"
                });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error authenticating platform connection");
                return StatusCode(500, new { error = "Failed to authenticate platform" });
            }
        }

        /// <summary>
        /// Disconnect a platform connection
        /// </summary>
        [HttpDelete("{id}")]
        public async Task<IActionResult> DisconnectPlatform(string id)
        {
            try
            {
                var connection = await _context.PlatformConnections.FindAsync(Guid.Parse(id));
                if (connection == null)
                    return NotFound();

                _context.PlatformConnections.Remove(connection);
                await _context.SaveChangesAsync();

                return Ok(new { message = "Platform disconnected successfully" });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error disconnecting platform {Id}", id);
                return StatusCode(500, new { error = "Failed to disconnect platform" });
            }
        }

        /// <summary>
        /// Exchange OAuth Code for Access Token
        /// </summary>
        [HttpPost("oauth-exchange")]
        public async Task<ActionResult<CreateConnectionResponse>> ExchangeOAuthCode(
            [FromBody] OAuthExchangeRequest request,
            [FromServices] IHttpClientFactory httpClientFactory)
        {
            try
            {
                if (string.IsNullOrEmpty(request.Platform) || string.IsNullOrEmpty(request.Code))
                {
                    return BadRequest(new { error = "Platform and Code are required" });
                }

                if (request.Platform.ToLowerInvariant() != "linkedin")
                {
                    return BadRequest(new { error = "OAuth exchange currently only supports LinkedIn" });
                }

                // Call LinkedIn to exchange the code
                var client = httpClientFactory.CreateClient();
                var tokenRequest = new HttpRequestMessage(HttpMethod.Post, "https://www.linkedin.com/oauth/v2/accessToken");
                
                var content = new FormUrlEncodedContent(new[]
                {
                    new KeyValuePair<string, string>("grant_type", "authorization_code"),
                    new KeyValuePair<string, string>("code", request.Code),
                    new KeyValuePair<string, string>("client_id", request.ClientId),
                    new KeyValuePair<string, string>("client_secret", request.ClientSecret),
                    new KeyValuePair<string, string>("redirect_uri", request.RedirectUri)
                });
                
                tokenRequest.Content = content;

                var response = await client.SendAsync(tokenRequest);
                var responseContent = await response.Content.ReadAsStringAsync();

                if (!response.IsSuccessStatusCode)
                {
                    _logger.LogError("LinkedIn OAuth exchange failed: {Status} {Content}", response.StatusCode, responseContent);
                    return BadRequest(new { error = "Failed to exchange OAuth code with LinkedIn" });
                }

                var tokenData = System.Text.Json.JsonDocument.Parse(responseContent);
                string accessToken = tokenData.RootElement.GetProperty("access_token").GetString() ?? "";
                int expiresIn = tokenData.RootElement.GetProperty("expires_in").GetInt32();

                // Save to database
                var existingConnection = await _context.PlatformConnections
                    .FirstOrDefaultAsync(pc =>
                        pc.UserId == request.UserId &&
                        pc.PlatformName == request.Platform);

                PlatformConnection connection;

                if (existingConnection != null)
                {
                    existingConnection.AccessToken = accessToken;
                    existingConnection.TokenExpiresAt = DateTime.UtcNow.AddSeconds(expiresIn);
                    existingConnection.IsConnected = true;
                    _context.PlatformConnections.Update(existingConnection);
                    connection = existingConnection;
                }
                else
                {
                    connection = new PlatformConnection
                    {
                        UserId = request.UserId,
                        PlatformName = request.Platform,
                        AccessToken = accessToken,
                        TokenExpiresAt = DateTime.UtcNow.AddSeconds(expiresIn),
                        IsConnected = true
                    };
                    _context.PlatformConnections.Add(connection);
                }

                await _context.SaveChangesAsync();

                return Ok(new CreateConnectionResponse
                {
                    Id = connection.Id,
                    Message = $"Successfully connected to {request.Platform} via OAuth"
                });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error exchanging OAuth code");
                return StatusCode(500, new { error = "Failed to process OAuth connection" });
            }
        }
    }

    public class PlatformConnectionDto
    {
        public Guid Id { get; set; }
        public string PlatformName { get; set; } = string.Empty;
        public bool IsConnected { get; set; }
        public DateTime? TokenExpiresAt { get; set; }
        public DateTime CreatedAt { get; set; }
    }

    public class AuthenticatePlatformRequest
    {
        public Guid UserId { get; set; }
        public string Platform { get; set; } = string.Empty;
        public string AccessToken { get; set; } = string.Empty;
        public string? RefreshToken { get; set; }
        public DateTime? TokenExpiresAt { get; set; }
    }

    public class CreateConnectionResponse
    {
        public Guid Id { get; set; }
        public string Message { get; set; } = string.Empty;
    }

    public class OAuthExchangeRequest
    {
        public Guid UserId { get; set; }
        public string Platform { get; set; } = string.Empty;
        public string Code { get; set; } = string.Empty;
        public string ClientId { get; set; } = string.Empty;
        public string ClientSecret { get; set; } = string.Empty;
        public string RedirectUri { get; set; } = string.Empty;
    }
}
