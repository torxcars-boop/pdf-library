// Utility for generating direct deep-link URLs to platform content and sharing cleanly

export type ShareContentType = 'book' | 'article' | 'video';

export function buildContentShareUrl(type: ShareContentType, id: string | number): string {
  if (typeof window === 'undefined') return '';
  try {
    const url = new URL(window.location.origin + window.location.pathname);
    url.searchParams.set('item', type);
    url.searchParams.set('id', String(id));
    return url.toString();
  } catch {
    return `${window.location.origin}/?item=${encodeURIComponent(type)}&id=${encodeURIComponent(String(id))}`;
  }
}

export async function copyLinkToClipboard(url: string): Promise<boolean> {
  if (!url) return false;
  try {
    if (typeof navigator !== 'undefined' && navigator.clipboard && typeof navigator.clipboard.writeText === 'function') {
      await navigator.clipboard.writeText(url);
      return true;
    }
  } catch {
    // Fallback to textarea copy below (common in sandboxed iframes)
  }

  try {
    const textarea = document.createElement('textarea');
    textarea.value = url;
    textarea.setAttribute('readonly', '');
    textarea.style.position = 'fixed';
    textarea.style.opacity = '0';
    textarea.style.pointerEvents = 'none';
    document.body.appendChild(textarea);
    textarea.select();
    textarea.setSelectionRange(0, url.length);
    const copied = document.execCommand('copy');
    document.body.removeChild(textarea);
    return copied;
  } catch {
    return false;
  }
}

export function canUseNativeShare(): boolean {
  return typeof navigator !== 'undefined' && typeof navigator.share === 'function';
}

export interface NativeSharePayload {
  title: string;
  text: string;
  url: string;
}

export async function shareContentNative(
  payload: NativeSharePayload
): Promise<'shared' | 'copied' | 'cancelled' | 'failed'> {
  if (canUseNativeShare()) {
    try {
      await navigator.share({
        title: payload.title,
        text: payload.text,
        url: payload.url,
      });
      return 'shared';
    } catch (err: any) {
      if (err && err.name === 'AbortError') {
        return 'cancelled';
      }
      // If browser/iframe disallowed native share, gracefully fall back to copying the direct link
    }
  }

  const copied = await copyLinkToClipboard(payload.url);
  return copied ? 'copied' : 'failed';
}
