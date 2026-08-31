import Script from 'next/script';
import type { Settings } from '@/types/database';

type AnalyticsSettings = Pick<Settings, 'ga4_measurement_id' | 'gtm_container_id' | 'clarity_project_id' | 'fb_pixel_id'>;

/**
 * Loads third-party analytics/tag-manager scripts, each strictly opt-in —
 * nothing renders until the corresponding id is set from /admin/seo. Lives
 * only in the (site) layout, never the admin portal, so admin usage is
 * never sent to a guest-facing analytics account. GA4 and GTM can both load
 * if both ids are set, but the /admin/seo help text recommends picking one
 * to avoid double-counting pageviews.
 */
export function AnalyticsScripts({ settings }: { settings: AnalyticsSettings }) {
  return (
    <>
      {settings.ga4_measurement_id && (
        <>
          <Script src={`https://www.googletagmanager.com/gtag/js?id=${settings.ga4_measurement_id}`} strategy="afterInteractive" />
          <Script id="ga4-init" strategy="afterInteractive">
            {`window.dataLayer = window.dataLayer || [];
              function gtag(){dataLayer.push(arguments);}
              gtag('js', new Date());
              gtag('config', '${settings.ga4_measurement_id}');`}
          </Script>
        </>
      )}
      {settings.gtm_container_id && (
        <Script id="gtm-init" strategy="afterInteractive">
          {`(function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],
              j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src=
              'https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);
              })(window,document,'script','dataLayer','${settings.gtm_container_id}');`}
        </Script>
      )}
      {settings.clarity_project_id && (
        <Script id="clarity-init" strategy="afterInteractive">
          {`(function(c,l,a,r,i,t,y){
              c[a]=c[a]||function(){(c[a].q=c[a].q||[]).push(arguments)};
              t=l.createElement(r);t.async=1;t.src="https://www.clarity.ms/tag/"+i;
              y=l.getElementsByTagName(r)[0];y.parentNode.insertBefore(t,y);
              })(window, document, "clarity", "script", "${settings.clarity_project_id}");`}
        </Script>
      )}
      {settings.fb_pixel_id && (
        <Script id="fb-pixel-init" strategy="afterInteractive">
          {`!function(f,b,e,v,n,t,s)
              {if(f.fbq)return;n=f.fbq=function(){n.callMethod?
              n.callMethod.apply(n,arguments):n.queue.push(arguments)};
              if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';
              n.queue=[];t=b.createElement(e);t.async=!0;
              t.src=v;s=b.getElementsByTagName(e)[0];
              s.parentNode.insertBefore(t,s)}(window, document,'script',
              'https://connect.facebook.net/en_US/fbevents.js');
              fbq('init', '${settings.fb_pixel_id}');
              fbq('track', 'PageView');`}
        </Script>
      )}
    </>
  );
}
