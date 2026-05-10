using System;

namespace SocialMarketingApi.Models
{
    public class PlatformConnection
    {
        public Guid Id { get; set; }
        public Guid UserId { get; set; }
        public string PlatformName { get; set; } = string.Empty;
        public string AccessToken { get; set; } = string.Empty;
        public string? RefreshToken { get; set; }
        public DateTime? TokenExpiresAt { get; set; }
        public bool IsConnected { get; set; }
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    }
}
