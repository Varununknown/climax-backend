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

const optimizeVideoUrl = (videoUrl) => {
  // If it's already an R2/CDN URL, return as is
  if (videoUrl.includes('r2.cloudflarestorage.com') || 
      videoUrl.includes(process.env.R2_CDN_DOMAIN)) {
    return videoUrl;
  }
  
  // If it's a relative path or key, convert to CDN URL
  if (!videoUrl.startsWith('http')) {
    return generateCDNUrl(videoUrl);
  }
  
  return videoUrl;
};

const getVideoStreamingUrl = (videoKey, quality = 'auto') => {
  const baseUrl = generateCDNUrl(videoKey);
  
  // Add Cloudflare streaming optimizations
  const params = new URLSearchParams({
    'cf-cache': 'true',
    'cf-polish': 'lossy',
    'cf-quality': quality
  });
  
  return `${baseUrl}?${params.toString()}`;
};

module.exports = {
  generateCDNUrl,
  optimizeVideoUrl,
  getVideoStreamingUrl
};