const generateCDNUrl = (r2Key, bucketName = process.env.R2_BUCKET_NAME) => {
  // If you have a custom domain/CDN set up for your R2 bucket
  const CDN_DOMAIN = process.env.R2_CDN_DOMAIN;
  
  if (CDN_DOMAIN) {
    // Use your custom CDN domain for super fast delivery
    return `https://${CDN_DOMAIN}/${r2Key}`;
  }
  
  // Fallback to direct R2 URL with optimized subdomain
  const R2_ACCOUNT_ID = process.env.R2_ACCOUNT_ID;
  if (R2_ACCOUNT_ID && bucketName) {
    return `https://${bucketName}.${R2_ACCOUNT_ID}.r2.cloudflarestorage.com/${r2Key}`;
  }
  
  // Final fallback
  return r2Key;
};

const optimizeVideoUrl = (videoUrl, quality = 'auto') => {
  // If it's already an R2/CDN URL, add optimization parameters
  if (videoUrl.includes('r2.cloudflarestorage.com') || 
      videoUrl.includes('r2.dev') ||
      videoUrl.includes(process.env.R2_CDN_DOMAIN)) {
    
    // Add Cloudflare optimization parameters for ultra-fast delivery
    const separator = videoUrl.includes('?') ? '&' : '?';
    const optimizations = [
      'cf-cache=max-age%3D31536000',
      'cf-polish=lossy',
      `cf-quality=${getQualityPercent(quality)}`,
      'cf-format=auto',
      'cf-dpr=1',
      'cf-fit=scale-down'
    ].join('&');
    
    return `${videoUrl}${separator}${optimizations}`;
  }
  
  // If it's a relative path or key, convert to optimized CDN URL
  if (!videoUrl.startsWith('http')) {
    return getVideoStreamingUrl(videoUrl, quality);
  }
  
  return videoUrl;
};

const getQualityPercent = (quality) => {
  const qualityMap = {
    '360p': '60',
    '480p': '70', 
    '720p': '80',
    '1080p': '90',
    'auto': '85'
  };
  return qualityMap[quality] || '85';
};

const getVideoStreamingUrl = (videoKey, quality = 'auto') => {
  const baseUrl = generateCDNUrl(videoKey);
  
  // Amazon Prime Video level optimizations
  const params = new URLSearchParams({
    // Caching optimizations
    'cf-cache': 'max-age=31536000,stale-while-revalidate=86400',
    
    // Video optimizations
    'cf-polish': 'lossy',
    'cf-quality': getQualityPercent(quality),
    'cf-format': 'auto',
    'cf-dpr': '1',
    'cf-fit': 'scale-down',
    
    // Streaming optimizations
    'cf-stream': 'true',
    'cf-preload': 'auto',
    'cf-optimization': 'aggressive',
    
    // Delivery optimizations
    'cf-min-compress': '1024',
    'cf-rocket-loader': 'off',
    'cf-always-online': 'on'
  });
  
  return `${baseUrl}?${params.toString()}`;
};

// Generate multiple quality URLs for adaptive streaming
const generateAdaptiveUrls = (videoUrl) => {
  const qualities = ['360p', '480p', '720p', '1080p'];
  const adaptiveUrls = {
    auto: optimizeVideoUrl(videoUrl, 'auto')
  };
  
  qualities.forEach(quality => {
    adaptiveUrls[quality] = optimizeVideoUrl(videoUrl, quality);
  });
  
  return adaptiveUrls;
};

// Pre-warm CDN cache for instant loading
const prewarmCDNCache = async (videoUrl) => {
  try {
    if (!videoUrl || !videoUrl.startsWith('http')) {
      return; // Skip pre-warm for invalid URLs
    }
    
    // Make a HEAD request to pre-warm the CDN cache
    const optimizedUrl = optimizeVideoUrl(videoUrl);
    await fetch(optimizedUrl, { 
      method: 'HEAD',
      headers: {
        'Cache-Control': 'max-age=31536000',
        'CF-Cache-Tag': 'video-content'
      },
      timeout: 5000
    });
    console.log(`🔥 CDN cache pre-warmed for: ${videoUrl}`);
  } catch (error) {
    // Silent fail - pre-warm is optional, don't spam logs
    // console.log('CDN pre-warm failed:', error.message);
  }
};

module.exports = {
  generateCDNUrl,
  optimizeVideoUrl,
  getVideoStreamingUrl,
  generateAdaptiveUrls,
  prewarmCDNCache,
  getQualityPercent
};