export function updateFavicon(url?: string) {
  if (!url) return;
  try {
    let link = document.querySelector("link[rel*='icon']") as HTMLLinkElement;
    if (link) {
      link.href = url;
    } else {
      link = document.createElement('link');
      link.rel = 'icon';
      link.href = url;
      document.head.appendChild(link);
    }
  } catch (e) {}
}
