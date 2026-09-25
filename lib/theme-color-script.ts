/** Inline <head> script: keeps <meta name="theme-color"> on the app's actual
 * theme (the navy or light --glide-chrome), not the phone's system setting.
 * The app is navy by default even on a light-mode phone, so a media-query
 * theme-color would paint a light status bar over a navy app. It reads the
 * saved theme before first paint (next-themes, key "glide-theme"), then
 * follows the `dark` class on <html> as the theme changes. */
const LIGHT = "#F7F9FC";
const DARK = "#0A2F5C";

export const THEME_COLOR_BOOT_SCRIPT = `(function(){try{var d=document.documentElement;var m=document.createElement('meta');m.name='theme-color';document.head.appendChild(m);function set(c){if(m.content!==c)m.content=c}var t=null;try{t=localStorage.getItem('glide-theme')}catch(e){}var dark=t==='light'?false:t==='system'?window.matchMedia('(prefers-color-scheme: dark)').matches:true;set(dark?'${DARK}':'${LIGHT}');new MutationObserver(function(){if(d.classList.contains('dark'))set('${DARK}');else if(d.classList.contains('light'))set('${LIGHT}')}).observe(d,{attributes:true,attributeFilter:['class']})}catch(e){}})();`;
