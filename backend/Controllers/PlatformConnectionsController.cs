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

        public PlatformConnectionsController(
            SocialMarketingContext context,
            ILogger<PlatformConnectionsController> logger)
        {
            _context = context;
            _logger = logger;
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
                    existingConnection.UpdatedAt = DateTime.UtcNow;
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
}
