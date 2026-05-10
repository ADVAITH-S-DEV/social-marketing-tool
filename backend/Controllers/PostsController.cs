using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using SocialMarketingApi.Data;
using System.Text.Json;
using System.Text;
using System.Net.Http.Headers;

namespace SocialMarketingApi.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class PostsController : ControllerBase
    {
        private readonly SocialMarketingContext _context;
        private readonly ILogger<PostsController> _logger;

        public PostsController(SocialMarketingContext context, ILogger<PostsController> logger)
        {
            _context = context;
            _logger = logger;
        }

        [HttpPost("publish")]
        public async Task<IActionResult> PublishPost(
            [FromBody] PublishPostRequest request,
            [FromServices] IHttpClientFactory httpClientFactory)
        {
            if (string.IsNullOrEmpty(request.Platform) || string.IsNullOrEmpty(request.Content))
            {
                return BadRequest(new { error = "Platform and content are required." });
            }

            var connection = await _context.PlatformConnections
                .FirstOrDefaultAsync(pc => pc.UserId == request.UserId && pc.PlatformName == request.Platform);

            if (connection == null || !connection.IsConnected)
            {
                return BadRequest(new { error = $"User is not connected to {request.Platform}." });
            }

            if (request.Platform.ToLowerInvariant() == "linkedin")
            {
                return await PublishToLinkedIn(request, connection, httpClientFactory);
            }

            return BadRequest(new { error = $"Publishing to {request.Platform} is not supported yet." });
        }

        private async Task<IActionResult> PublishToLinkedIn(PublishPostRequest request, Models.PlatformConnection connection, IHttpClientFactory httpClientFactory)
        {
            var client = httpClientFactory.CreateClient();
            client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", connection.AccessToken);

            // 1. Get userinfo to find the URN
            var userInfoResponse = await client.GetAsync("https://api.linkedin.com/v2/userinfo");
            if (!userInfoResponse.IsSuccessStatusCode)
            {
                _logger.LogError("Failed to fetch LinkedIn userinfo: {Status}", userInfoResponse.StatusCode);
                return StatusCode(500, new { error = "Failed to fetch LinkedIn profile information." });
            }

            var userInfoStr = await userInfoResponse.Content.ReadAsStringAsync();
            var userInfoDoc = JsonDocument.Parse(userInfoStr);
            string sub = userInfoDoc.RootElement.GetProperty("sub").GetString() ?? "";

            if (string.IsNullOrEmpty(sub))
            {
                return StatusCode(500, new { error = "LinkedIn profile response did not contain 'sub'." });
            }

            string authorUrn = $"urn:li:person:{sub}";

            // 2. Publish to /rest/posts
            var postPayload = new
            {
                author = authorUrn,
                commentary = request.Content,
                visibility = "PUBLIC",
                distribution = new
                {
                    feedDistribution = "MAIN_FEED",
                    targetEntities = new string[] { },
                    thirdPartyDistributionChannels = new string[] { }
                },
                lifecycleState = "PUBLISHED",
                isReshareDisabledByAuthor = false
            };

            var jsonPayload = JsonSerializer.Serialize(postPayload);

            var postRequest = new HttpRequestMessage(HttpMethod.Post, "https://api.linkedin.com/rest/posts")
            {
                Content = new StringContent(jsonPayload, Encoding.UTF8, "application/json")
            };
            postRequest.Headers.Add("LinkedIn-Version", "202604");
            postRequest.Headers.Add("X-Restli-Protocol-Version", "2.0.0");

            var publishResponse = await client.SendAsync(postRequest);
            var publishResponseStr = await publishResponse.Content.ReadAsStringAsync();

            if (!publishResponse.IsSuccessStatusCode)
            {
                _logger.LogError("LinkedIn publish failed: {Status} {Content}", publishResponse.StatusCode, publishResponseStr);
                return StatusCode(500, new { error = "Failed to publish post to LinkedIn.", details = publishResponseStr });
            }

            return Ok(new { message = "Successfully published to LinkedIn." });
        }
    }

    public class PublishPostRequest
    {
        public Guid UserId { get; set; }
        public Guid PostId { get; set; }
        public string Platform { get; set; } = string.Empty;
        public string Content { get; set; } = string.Empty;
    }
}
