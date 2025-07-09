-- Database Functions Documentation for Application Implementation
-- =====================================================
-- Due to ClickHouse version limitations, these functions should be implemented
-- in your application code. Below are the function signatures and logic.

-- 1. extractDomain(url: string): string
-- -------------------------------------
-- Extracts the domain from a URL, removing 'www.' prefix if present
--
-- Implementation (JavaScript/TypeScript example):
/*
function extractDomain(url) {
  try {
    const hostname = new URL(url).hostname;
    return hostname.replace(/^www\./i, '');
  } catch (e) {
    return '';
  }
}
*/

-- 2. getDeviceType(userAgent: string): 'desktop' | 'mobile' | 'tablet'
-- --------------------------------------------------------------------
-- Determines the device type from the User-Agent string
--
-- Implementation (JavaScript/TypeScript example):
/*
function getDeviceType(userAgent) {
  const ua = userAgent.toLowerCase();
  const isMobile = /mobile|android|iphone|ipad|ipod|windows phone|blackberry|iemobile/i.test(ua);
  
  if (!isMobile) return 'desktop';
  if (/ipad/i.test(ua)) return 'tablet';
  if (/android.*mobile|mobile/i.test(ua)) return 'mobile';
  return 'tablet';
}
*/

-- 3. getBrowserFamily(userAgent: string): string
-- ---------------------------------------------
-- Extracts the browser family from the User-Agent string
--
-- Implementation (JavaScript/TypeScript example):
/*
function getBrowserFamily(userAgent) {
  const ua = userAgent.toLowerCase();
  
  if (/chrome/i.test(ua)) return 'Chrome';
  if (/firefox/i.test(ua)) return 'Firefox';
  if (/safari/i.test(ua)) return 'Safari';
  if (/edge/i.test(ua)) return 'Edge';
  if (/msie|trident/i.test(ua)) return 'Internet Explorer';
  if (/opera|opr/i.test(ua)) return 'Opera';
  
  return 'Other';
}
*/

-- Note: These functions should be called in your application code before
-- inserting data into ClickHouse, as the database version has limitations
-- with custom functions and macros.
