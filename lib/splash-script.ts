/** Inline <head> script: on a cold launch of the installed app (standalone
 * display mode, first load this session), mark <html data-splash> before the
 * first paint so the splash covers the app from frame one. Switching back to
 * a running app doesn't reload, so it never replays then. */
export const SPLASH_BOOT_SCRIPT = `try{var s=(window.matchMedia&&window.matchMedia('(display-mode: standalone)').matches)||navigator.standalone===true;if(s&&!sessionStorage.getItem('glide.splash')){sessionStorage.setItem('glide.splash','1');document.documentElement.setAttribute('data-splash','1')}}catch(e){}`;
