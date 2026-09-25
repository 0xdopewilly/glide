/** Inline <head> script (runs before first paint, and on resize).
 *
 * iOS 26+ lays home-screen web apps out *between* the status bar and the home
 * indicator (iOS paints both strips itself), yet still reports
 * env(safe-area-inset-bottom) ≈ 34px — so bottom padding built from it shows
 * up twice under the tab bar. When the installed app, in portrait, is clearly
 * shorter than the screen (status bar + home indicator ≳ 70px), zero the
 * bottom inset. Everywhere else --glide-safe-bottom stays the real env() value
 * (see :root in globals.css). */
export const VIEWPORT_BOOT_SCRIPT = `(function(){try{var d=document.documentElement;function fit(){var sa=(window.matchMedia&&window.matchMedia('(display-mode: standalone)').matches)||navigator.standalone===true;var portrait=window.innerHeight>window.innerWidth;var full=Math.max(screen.width,screen.height);if(sa&&portrait&&full-window.innerHeight>=70){d.style.setProperty('--glide-safe-bottom','0px')}else{d.style.removeProperty('--glide-safe-bottom')}}fit();window.addEventListener('resize',fit)}catch(e){}})();`;
