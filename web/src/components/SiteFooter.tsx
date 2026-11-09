/* The site's footer — the studio that built it, and how to reach it for more work (the user,
   4.11.2026; the contact changed 9.11.2026 to רס״ן צביקה פרנקל, 0522901205).

   The logo is ARTECH's own mark, its paths copied from the studio's SVG — drawn in currentColor
   so it takes the site's maroon: its blue is a palette the site never uses, and the white
   version is a white the site never shows (rule: no white anywhere). */
import '@/styles/site-footer.css'

const CONTACT = 'רס״ן צביקה פרנקל'
const PHONE = '052-2901205'
const TEL = 'tel:+972522901205'

export default function SiteFooter() {
  return (
    <footer className="site-footer">
      <div className="site-footer-inner">
        <p className="site-footer-contact">
          לעוד פרויקטים צרו קשר עם {CONTACT}
          <a href={TEL} dir="ltr">{PHONE}</a>
        </p>
        <svg className="site-footer-mark" viewBox="0 0 360.14 84.24" role="img" aria-label="ARTECH">
          <path d="M129.74,57.39v6.65h-8.18v-1.46c0-3-.15-5.85-.51-8.55h-25.5c-.37,2.7-.51,5.55-.51,8.55v1.46h-8.18v-6.65h0c1.1-18.12,7.89-27.77,16.73-37.19h9.43c8.84,9.43,15.64,19.07,16.73,37.19h0ZM119.95,47.96c-2.19-9.13-6.43-16.08-11.62-20.9-5.26,4.82-9.5,11.76-11.69,20.9h23.31Z" />
          <path d="M172.85,57.32l3.91,6.72h-9.46l-9.06-15.86h-9.94v15.86h-8.33V26.92h-4.97v-6.72h25.65c12.93,0,17.24,4.6,17.24,13.74,0,7.53-2.85,12.2-10.89,13.74l5.85,9.65h0ZM148.3,41.53h11.33c7.53,0,9.94-2.48,9.94-7.38s-2.41-7.23-9.94-7.23h-11.33v14.61Z" />
          <path d="M223.27,26.85h-15.78v37.19h-8.33V26.85h-16.66v-4.46c0-1.61.51-2.19,2.19-2.19h38.58v6.65Z" />
          <path d="M239.5,26.92v11.47h24.77v6.43h-24.77v12.49h27.69v6.72h-36.02V22.61c0-1.61.8-2.41,2.48-2.41h33.54v6.72h-27.69,0Z" />
          <path d="M309.65,20.2v6.65h-17.03c-7.16,0-10.52,3.22-10.52,10.16v10.16c0,6.94,3.36,10.23,10.52,10.23h17.03v6.65h-19.44c-11.33,0-16.44-4.82-16.44-15.49v-12.93c0-10.59,5.11-15.42,16.44-15.42h19.44Z" />
          <path d="M360.14,20.2v43.84h-8.33v-18.41h-24.33v18.41h-8.33V20.2h8.33v18.71h24.33v-18.71h8.33Z" />
          <polygon points="84.24 7.05 81.2 2.56 45.04 26.95 7.06 0 2.55 3.03 26.95 39.2 0 77.19 3.04 81.69 39.2 57.29 77.19 84.24 81.69 81.21 57.29 45.04 84.24 7.05" />
        </svg>
      </div>
    </footer>
  )
}
