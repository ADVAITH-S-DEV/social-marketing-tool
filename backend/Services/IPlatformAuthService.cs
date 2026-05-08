namespace SocialMarketingApi.Services
{
    public interface IPlatformAuthService
    {
        string GetOAuthUrl(string platform, string userId);
        Task<PlatformAuthResponse> HandleOAuthCallback(string platform, string code, string userId);
    }

    public class PlatformAuthResponse
    {
        public bool Success { get; set; }
        public string? AccessToken { get; set; }
        public string? RefreshToken { get; set; }
        public DateTime? ExpiresAt { get; set; }
        public string? ErrorMessage { get; set; }
    }
}
