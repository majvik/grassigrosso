const clipPath404 =
  'M323.324 7.35773V401.656H253.927V36.273H282.317L56.2524 287.573L54.6752 262.863H395.349V318.591H-0.000814685V268.646L235.001 7.35773H323.324ZM630.347 409.016C587.237 409.016 550.085 400.605 518.892 383.781C487.698 366.607 463.69 342.774 446.867 312.282C430.043 281.439 421.632 245.514 421.632 204.507C421.632 163.5 430.043 127.75 446.867 97.2578C463.69 66.4149 487.698 42.5817 518.892 25.7583C550.085 8.58444 587.237 -0.00251154 630.347 -0.00251154C673.457 -0.00251154 710.433 8.58444 741.276 25.7583C772.47 42.5817 796.478 66.4149 813.301 97.2578C830.125 127.75 838.537 163.5 838.537 204.507C838.537 245.514 830.125 281.439 813.301 312.282C796.478 342.774 772.47 366.607 741.276 383.781C710.433 400.605 673.457 409.016 630.347 409.016ZM630.347 351.712C674.158 351.712 708.155 338.919 732.339 313.333C756.522 287.397 768.614 251.122 768.614 204.507C768.614 157.892 756.522 121.792 732.339 96.2063C708.155 70.2703 674.158 57.3022 630.347 57.3022C586.536 57.3022 552.363 70.2703 527.829 96.2063C503.646 121.792 491.554 157.892 491.554 204.507C491.554 251.122 503.646 287.397 527.829 313.333C552.363 338.919 586.536 351.712 630.347 351.712ZM1187.91 7.35773V401.656H1118.51V36.273H1146.9L920.834 287.573L919.257 262.863H1259.93V318.591H864.581V268.646L1099.58 7.35773H1187.91Z'

export function NotFoundPage() {
  return (
    <section className="page-404">
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 1260 410"
        width="1260"
        height="410"
        aria-hidden="true"
        style={{ height: 0, overflow: 'hidden', pointerEvents: 'none', position: 'absolute', width: 0 }}
      >
        <defs>
          <clipPath id="clip404" clipPathUnits="objectBoundingBox">
            <path transform="translate(0.0000006, 0) scale(0.00079365, 0.00243902)" d={clipPath404} />
          </clipPath>
        </defs>
      </svg>
      <div className="page-404-video-wrap">
        <video poster="/grassigrosso-poster.avif" autoPlay loop muted playsInline>
          <source src="/grassigrosso-silent.av1.mp4" type="video/mp4; codecs=av01.0.08M.08" />
          <source src="/grassigrosso-silent.webm" type="video/webm" />
          <source src="/grassigrosso-silent.mp4" type="video/mp4" />
        </video>
      </div>
      <div className="page-404-content">
        <h1 className="page-404-title">Страница не найдена</h1>
        <a href="/" className="page-404-link">
          Вернуться на главную →
        </a>
      </div>
    </section>
  )
}
