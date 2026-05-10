using Microsoft.EntityFrameworkCore;
using SocialMarketingApi.Models;

namespace SocialMarketingApi.Data
{
    public class SocialMarketingContext : DbContext
    {
        public SocialMarketingContext(DbContextOptions<SocialMarketingContext> options)
            : base(options)
        {
        }

        public DbSet<PlatformConnection> PlatformConnections { get; set; } = null!;

        protected override void OnModelCreating(ModelBuilder modelBuilder)
        {
            base.OnModelCreating(modelBuilder);

            modelBuilder.Entity<PlatformConnection>(entity =>
            {
                entity.HasKey(e => e.Id);
                entity.Property(e => e.Id).HasDefaultValueSql("gen_random_uuid()");
                entity.Property(e => e.UserId).IsRequired();
                entity.Property(e => e.PlatformName).HasMaxLength(50).IsRequired();
                entity.Property(e => e.AccessToken).IsRequired();
                entity.Property(e => e.RefreshToken).HasMaxLength(500);
                entity.Property(e => e.IsConnected).HasDefaultValue(false);
                entity.Property(e => e.CreatedAt).HasDefaultValueSql("now()");
                
                entity.ToTable("platform_accounts");
                entity.Property(e => e.Id).HasColumnName("id");
                entity.Property(e => e.UserId).HasColumnName("user_id");
                entity.Property(e => e.PlatformName).HasColumnName("platform_name");
                entity.Property(e => e.AccessToken).HasColumnName("access_token");
                entity.Property(e => e.RefreshToken).HasColumnName("refresh_token");
                entity.Property(e => e.TokenExpiresAt).HasColumnName("token_expires_at");
                entity.Property(e => e.IsConnected).HasColumnName("is_connected");
                entity.Property(e => e.CreatedAt).HasColumnName("created_at");
            });
        }
    }
}
