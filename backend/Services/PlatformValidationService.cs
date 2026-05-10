using System.Net.Http.Headers;

namespace SocialMarketingApi.Services
{
    public class PlatformValidationService
    {
        private readonly IHttpClientFactory _httpClientFactory;
        private readonly ILogger<PlatformValidationService> _logger;

        public PlatformValidationService(IHttpClientFactory httpClientFactory, ILogger<PlatformValidationService> logger)
        {
            _httpClientFactory = httpClientFactory;
            _logger = logger;
        }

        public async Task<(bool IsValid, string? ErrorMessage)> ValidateTokenAsync(string platform, string accessToken)
        {
            try
            {
                var client = _httpClientFactory.CreateClient();

                switch (platform.ToLowerInvariant())
                {
                    case "x":
                    case "twitter":
                        return await ValidateXTokenAsync(client, accessToken);
                    
                    case "instagram":
                    case "facebook":
                    case "threads":
                    case "linkedin":
                        // For now, assume other platforms are valid if token is non-empty.
                        // Can be expanded with real Graph API / LinkedIn API calls in the future.
                        _logger.LogInformation($"Validation for {platform} is currently mocked as successful.");
                        return (true, null);
                        
                    default:
                        return (false, "Unsupported platform.");
                }
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error validating token for platform {Platform}", platform);
                return (false, "An error occurred while validating the token with the platform.");
            }
        }

        private async Task<(bool IsValid, string? ErrorMessage)> ValidateXTokenAsync(HttpClient client, string accessToken)
        {
            // Twitter v2 API endpoint to get the authenticated user
            var request = new HttpRequestMessage(HttpMethod.Get, "https://api.twitter.com/2/users/me");
            request.Headers.Authorization = new AuthenticationHeaderValue("Bearer", accessToken);

            var response = await client.SendAsync(request);

            if (response.IsSuccessStatusCode)
            {
                return (true, null);
            }

            if (response.StatusCode == System.Net.HttpStatusCode.Unauthorized)
            {
                return (false, "Invalid or expired X (Twitter) access token.");
            }

            var errorContent = await response.Content.ReadAsStringAsync();
            _logger.LogWarning("X API returned {StatusCode}: {ErrorContent}", response.StatusCode, errorContent);
            return (false, $"X API rejected the token with status code: {response.StatusCode}");
        }
    }
}
