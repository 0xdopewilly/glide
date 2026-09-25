/** Inline <head> script (runs before first paint, and on resize). Fits the
 * installed iOS web app to the real screen. It measures, then picks one of:
 *
 *  A. The app sits *between* the status bar and the home indicator (iOS
 *     paints both strips), yet iOS still reports a ~34px bottom inset: the
 *     app is short of the screen by ≥70px. Fix: zero --glide-safe-bottom so
 *     the tab bar's inset isn't applied twice.
 *  B. The app draws under the status bar (black-translucent), but iOS sizes
 *     the viewport as screen − status bar, so fixed full-screen shells stop
 *     that far short of the bottom edge: the gap equals the top inset. Fix:
 *     --glide-shell-extend = top inset; .glide-full-screen stretches down by
 *     it (globals.css).
 *
 * Anything else: no change. Details: memory/ios-bars; diagnostics: tap the
 * app version in Profile 5 times. */
export const VIEWPORT_BOOT_SCRIPT = `(function(){try{var d=document.documentElement;function inset(s){var p=document.createElement('div');p.style.cssText='position:fixed;left:0;top:0;width:0;visibility:hidden;pointer-events:none;height:env(safe-area-inset-'+s+',0px)';d.appendChild(p);var h=p.getBoundingClientRect().height;d.removeChild(p);return h}function fit(){d.style.removeProperty('--glide-safe-bottom');d.style.removeProperty('--glide-shell-extend');var sa=(window.matchMedia&&window.matchMedia('(display-mode: standalone)').matches)||navigator.standalone===true;var portrait=window.innerHeight>window.innerWidth;if(!sa||!portrait)return;var gap=Math.max(screen.width,screen.height)-window.innerHeight;if(gap>=70){d.style.setProperty('--glide-safe-bottom','0px');d.dataset.viewportFix='A';return}var top=inset('top');if(gap>0&&top>0&&Math.abs(gap-top)<=14){d.style.setProperty('--glide-shell-extend',gap+'px');d.dataset.viewportFix='B';return}d.dataset.viewportFix='none'}fit();window.addEventListener('resize',fit);window.addEventListener('orientationchange',fit)}catch(e){}})();`;
