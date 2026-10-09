import React from 'react'

/**
 * Bộ Icon Wibu độc quyền: Miss Kobayashi's Dragon Maid (Hầu Gái Rồng Tohru)
 * Phong cách dễ thương, anime, cánh rồng, sừng rồng, nơ hầu gái, thịt đuôi rồng và ma pháp trận!
 */

// Sừng Rồng Tohru kèm nơ hầu gái
export function TohruHornsIcon({ size = 20, className = '', color = 'currentColor' }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      {/* Sừng bên trái */}
      <path
        d="M6 16C4.5 12 3 8 7 4C7.5 7 8 10 9.5 13"
        stroke={color}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {/* Sừng bên phải */}
      <path
        d="M18 16C19.5 12 21 8 17 4C16.5 7 16 10 14.5 13"
        stroke={color}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {/* Dải băng hầu gái ở giữa */}
      <path
        d="M7 16C9 14.5 15 14.5 17 16"
        stroke={color}
        strokeWidth="2"
        strokeLinecap="round"
      />
      {/* Nơ trung tâm */}
      <path
        d="M10.5 16.5L12 18L13.5 16.5L12 15L10.5 16.5Z"
        fill={color}
      />
      {/* Chi tiết hoa ren hầu gái */}
      <circle cx="8" cy="15" r="1" fill={color} />
      <circle cx="16" cy="15" r="1" fill={color} />
      <circle cx="12" cy="19.5" r="1.2" fill={color} />
    </svg>
  )
}

// Nơ Hầu Gái & Băng Đô Ren (Maid Headband & Ribbon)
export function MaidBowIcon({ size = 20, className = '', color = 'currentColor' }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      {/* Băng đô vòm ren */}
      <path
        d="M4 15C4 9.47715 8.47715 5 14 5C16.5 5 18.8 5.9 20 7.5"
        stroke={color}
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeDasharray="2 3"
      />
      {/* Cánh nơ trái */}
      <path
        d="M12 13C8.5 10.5 6 12 6.5 15C7 17.5 10 16 12 14.5"
        fill="currentColor"
        fillOpacity="0.25"
        stroke={color}
        strokeWidth="1.8"
        strokeLinejoin="round"
      />
      {/* Cánh nơ phải */}
      <path
        d="M12 13C15.5 10.5 18 12 17.5 15C17 17.5 14 16 12 14.5"
        fill="currentColor"
        fillOpacity="0.25"
        stroke={color}
        strokeWidth="1.8"
        strokeLinejoin="round"
      />
      {/* Nút thắt nơ */}
      <circle cx="12" cy="13.8" r="2.2" fill={color} />
      {/* Dây ruy băng rủ xuống */}
      <path
        d="M10.8 15.5L8.5 21L11.5 19.5"
        stroke={color}
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M13.2 15.5L15.5 21L12.5 19.5"
        stroke={color}
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

// Đuôi Rồng Tohru (Dragon Tail)
export function DragonTailIcon({ size = 20, className = '', color = 'currentColor' }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      {/* Uốn lượn thân đuôi rồng to bự */}
      <path
        d="M3 20C4 16 7 13 11 12C15 11 18 8 19 3C21 7 21 12 17 16C13 20 8 21 3 20Z"
        fill="currentColor"
        fillOpacity="0.2"
        stroke={color}
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {/* Gai rồng trên lưng đuôi */}
      <path d="M11 12L12 9.5L13.5 11.5" stroke={color} strokeWidth="1.6" strokeLinecap="round" />
      <path d="M15 13.5L17 12L17.5 14" stroke={color} strokeWidth="1.6" strokeLinecap="round" />
      {/* Vết cắt khoanh thịt đuôi ngon lành */}
      <ellipse cx="6" cy="18.5" rx="2.5" ry="1.5" fill={color} fillOpacity="0.5" stroke={color} strokeWidth="1.2" />
    </svg>
  )
}

// Khúc Thịt Đuôi Rồng Nướng Của Tohru Dâng Kobayashi (Dragon Meat)
export function DragonMeatIcon({ size = 20, className = '', color = 'currentColor' }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      {/* Khúc xương nhô ra */}
      <path d="M4 6L8 10" stroke={color} strokeWidth="2.5" strokeLinecap="round" />
      <circle cx="3.5" cy="5.5" r="1.5" fill={color} />
      <circle cx="5.5" cy="3.5" r="1.5" fill={color} />
      {/* Miếng thịt đùi to múp míp */}
      <path
        d="M7 11C6 15 9 19 13.5 20C17.5 21 21 18.5 20.5 14C20 10.5 16 7.5 12 8C9.5 8.3 8 9.5 7 11Z"
        fill="currentColor"
        fillOpacity="0.28"
        stroke={color}
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {/* Vệt nướng thơm lừng */}
      <path d="M11 12C13 14 15 13 17 15" stroke={color} strokeWidth="1.4" strokeLinecap="round" />
      <path d="M13 16C15 17.5 17 17 18 18" stroke={color} strokeWidth="1.4" strokeLinecap="round" />
      {/* Trái tim tình yêu của Tohru */}
      <path
        d="M14.5 10.5C14.5 9.5 15.5 9 16.5 9.5C17.5 9 18.5 9.5 18.5 10.5C18.5 11.8 16.5 13 16.5 13C16.5 13 14.5 11.8 14.5 10.5Z"
        fill={color}
      />
    </svg>
  )
}

// Lửa Rồng & Trái Tim Ma Thuật (Dragon Flame & Heart)
export function DragonFlameIcon({ size = 20, className = '', color = 'currentColor' }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      {/* Ngọn lửa rồng rực cháy */}
      <path
        d="M12 2C12 2 15 6 15 9C15 10 16 11 17 11C19.5 11 21 13 21 16C21 19.3 17 22 12 22C7 22 3 19.3 3 16C3 13.5 4.5 11.5 7 10C7 8 8 5 12 2Z"
        fill="currentColor"
        fillOpacity="0.25"
        stroke={color}
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {/* Lõi lửa hình trái tim tình yêu của Tohru dành cho Kobayashi */}
      <path
        d="M12 18.5C12 18.5 8.5 16 8.5 13.5C8.5 12 9.7 11 11 11.8C11.5 12.1 12 12.6 12 12.6C12 12.6 12.5 12.1 13 11.8C14.3 11 15.5 12 15.5 13.5C15.5 16 12 18.5 12 18.5Z"
        fill={color}
      />
    </svg>
  )
}

// Cánh Rồng Thần Thoại (Dragon Wings)
export function DragonWingsIcon({ size = 20, className = '', color = 'currentColor' }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      {/* Khung xương cánh rồng trái */}
      <path
        d="M12 15C9 10 5 7 2 6C3 11 5 15 8 18C10 16 11 15 12 15Z"
        fill="currentColor"
        fillOpacity="0.2"
        stroke={color}
        strokeWidth="1.6"
        strokeLinejoin="round"
      />
      {/* Khung xương cánh rồng phải */}
      <path
        d="M12 15C15 10 19 7 22 6C21 11 19 15 16 18C14 16 13 15 12 15Z"
        fill="currentColor"
        fillOpacity="0.2"
        stroke={color}
        strokeWidth="1.6"
        strokeLinejoin="round"
      />
      {/* Đỉnh gai cánh */}
      <path d="M2 6L4 8" stroke={color} strokeWidth="1.8" strokeLinecap="round" />
      <path d="M22 6L20 8" stroke={color} strokeWidth="1.8" strokeLinecap="round" />
      <circle cx="12" cy="15.5" r="1.5" fill={color} />
    </svg>
  )
}

// Trận Đồ Ma Thuật Cổ Đại Chaos Dragon (Magic Rune Circle)
export function MagicCircleIcon({ size = 20, className = '', color = 'currentColor' }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      {/* Vòng tròn bên ngoài */}
      <circle cx="12" cy="12" r="9.5" stroke={color} strokeWidth="1.5" />
      <circle cx="12" cy="12" r="7.5" stroke={color} strokeWidth="1" strokeDasharray="1.5 2.5" />
      {/* Ngôi sao ma thuật rồng 4 cánh */}
      <path
        d="M12 4.5L13.8 10.2L19.5 12L13.8 13.8L12 19.5L10.2 13.8L4.5 12L10.2 10.2L12 4.5Z"
        fill="currentColor"
        fillOpacity="0.2"
        stroke={color}
        strokeWidth="1.3"
        strokeLinejoin="round"
      />
      {/* Điểm tâm ma lực */}
      <circle cx="12" cy="12" r="2" fill={color} />
    </svg>
  )
}

// Tách Trà Hầu Gái & Bánh Ngọt Elma (Tea Cup & Sweets)
export function MaidTeaIcon({ size = 20, className = '', color = 'currentColor' }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      {/* Dĩa lót tách trà */}
      <path d="M3 19C7 21 17 21 21 19" stroke={color} strokeWidth="1.8" strokeLinecap="round" />
      {/* Thân tách trà */}
      <path
        d="M5 9C5 15 8 18 12 18C16 18 19 15 19 9H5Z"
        fill="currentColor"
        fillOpacity="0.22"
        stroke={color}
        strokeWidth="1.8"
        strokeLinejoin="round"
      />
      {/* Quai cầm tách */}
      <path
        d="M19 10.5C21 10.5 22 12 22 13.5C22 15 20.5 16 19 16"
        stroke={color}
        strokeWidth="1.6"
        strokeLinecap="round"
      />
      {/* Hơi trà nóng bốc lên hình trái tim */}
      <path
        d="M10 5.5C9.5 4 10.5 3 12 3C13.5 3 14.5 4 14 5.5C13.5 7 12 8 12 8"
        stroke={color}
        strokeWidth="1.4"
        strokeLinecap="round"
      />
    </svg>
  )
}

// Đuôi Kanna Kamui (Kanna's Round Tail with Power Plug)
export function KannaTailIcon({ size = 20, className = '', color = 'currentColor' }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      {/* Dây đuôi nhỏ mảnh */}
      <path d="M4 18C7 16 10 17 12 13" stroke={color} strokeWidth="1.8" strokeLinecap="round" />
      {/* Cục bông tròn xù xì đuôi Kanna */}
      <circle
        cx="16"
        cy="9"
        r="5.5"
        fill="currentColor"
        fillOpacity="0.3"
        stroke={color}
        strokeWidth="1.8"
      />
      {/* Chấu cắm điện sạc pin của Kanna */}
      <path d="M21 7L23 6" stroke={color} strokeWidth="2" strokeLinecap="round" />
      <path d="M22 10L24 10" stroke={color} strokeWidth="2" strokeLinecap="round" />
      {/* Tia chớp tí hon */}
      <path d="M15 7L14 9.5H16.5L15.5 12" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

// Kính Cận Của Kobayashi-san (Kobayashi's Glasses)
export function KobayashiGlassesIcon({ size = 20, className = '', color = 'currentColor' }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      {/* Tròng kính trái */}
      <rect
        x="2.5"
        y="8.5"
        width="8"
        height="7"
        rx="2.5"
        fill="currentColor"
        fillOpacity="0.2"
        stroke={color}
        strokeWidth="1.8"
      />
      {/* Tròng kính phải */}
      <rect
        x="13.5"
        y="8.5"
        width="8"
        height="7"
        rx="2.5"
        fill="currentColor"
        fillOpacity="0.2"
        stroke={color}
        strokeWidth="1.8"
      />
      {/* Cầu nối giữa 2 tròng */}
      <path d="M10.5 11.5C11.5 10.8 12.5 10.8 13.5 11.5" stroke={color} strokeWidth="1.8" strokeLinecap="round" />
      {/* Gọng kính hai bên */}
      <path d="M2.5 10.5L1 9" stroke={color} strokeWidth="1.8" strokeLinecap="round" />
      <path d="M21.5 10.5L23 9" stroke={color} strokeWidth="1.8" strokeLinecap="round" />
      {/* Ánh phản chiếu trí thức */}
      <path d="M4.5 11L7 11" stroke={color} strokeWidth="1.2" strokeLinecap="round" />
      <path d="M15.5 11L18 11" stroke={color} strokeWidth="1.2" strokeLinecap="round" />
    </svg>
  )
}

// Logo Biểu Tượng XForge Hầu Gái Rồng (XForge Dragon Crest)
export function XForgeDragonCrest({ size = 32, className = '' }) {
  return (
    <div className={`relative inline-flex items-center justify-center ${className}`} style={{ width: size, height: size }}>
      <svg
        width={size}
        height={size}
        viewBox="0 0 32 32"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <defs>
          <linearGradient id="crestGrad" x1="2" y1="2" x2="30" y2="30" gradientUnits="userSpaceOnUse">
            <stop stopColor="#ff7043" />
            <stop offset="0.5" stopColor="#f43f5e" />
            <stop offset="1" stopColor="#fbbf24" />
          </linearGradient>
        </defs>

        {/* Khung khiên vảy rồng */}
        <path
          d="M16 2L28 7V17C28 24 22 28.5 16 30.5C10 28.5 4 24 4 17V7L16 2Z"
          fill="url(#crestGrad)"
          fillOpacity="0.2"
          stroke="url(#crestGrad)"
          strokeWidth="2"
          strokeLinejoin="round"
        />

        {/* Sừng rồng Tohru uốn lên 2 bên */}
        <path
          d="M9 13C7 9 7 5 11 3C11 6 12 8 13 11"
          stroke="#fbbf24"
          strokeWidth="1.8"
          strokeLinecap="round"
        />
        <path
          d="M23 13C25 9 25 5 21 3C21 6 20 8 19 11"
          stroke="#fbbf24"
          strokeWidth="1.8"
          strokeLinecap="round"
        />

        {/* Nơ hầu gái đỏ đặc trưng */}
        <path
          d="M16 14L12.5 11.5C11.5 13.5 13.5 15.5 16 14.5L19.5 11.5C20.5 13.5 18.5 15.5 16 14.5Z"
          fill="#f43f5e"
        />
        <circle cx="16" cy="13.5" r="2" fill="#fff" />

        {/* Chữ X ma pháp rồng phát sáng */}
        <path
          d="M11 18L21 27M21 18L11 27"
          stroke="#ffedd5"
          strokeWidth="2.5"
          strokeLinecap="round"
        />
      </svg>
    </div>
  )
}

export const AcousticForgeDragonCrest = XForgeDragonCrest

// Avatar Chibi Tohru vẽ bằng SVG siêu sắc nét, dễ thương
export function TohruChibiAvatar({ size = 48, className = '', emotion = 'happy' }) {
  return (
    <div className={`relative inline-flex items-center justify-center select-none ${className}`} style={{ width: size, height: size }}>
      <svg
        width={size}
        height={size}
        viewBox="0 0 64 64"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="overflow-visible"
      >
        <defs>
          {/* Sừng rồng gradient */}
          <linearGradient id="tohruHornGrad" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#fef08a" />
            <stop offset="50%" stopColor="#f59e0b" />
            <stop offset="100%" stopColor="#b45309" />
          </linearGradient>
          {/* Tóc vàng gradient */}
          <linearGradient id="tohruHairGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#fef08a" />
            <stop offset="70%" stopColor="#fde047" />
            <stop offset="100%" stopColor="#f97316" />
          </linearGradient>
          {/* Mắt đỏ cam rực rỡ */}
          <linearGradient id="tohruEyeGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#dc2626" />
            <stop offset="60%" stopColor="#ea580c" />
            <stop offset="100%" stopColor="#facc15" />
          </linearGradient>
          {/* Khung nền tỏa sáng */}
          <radialGradient id="tohruAura" cx="50%" cy="50%" r="50%">
            <stop offset="60%" stopColor="#f97316" stopOpacity="0.25" />
            <stop offset="100%" stopColor="#f97316" stopOpacity="0" />
          </radialGradient>
        </defs>

        {/* Vầng hào quang lửa rồng */}
        <circle cx="32" cy="32" r="30" fill="url(#tohruAura)" />

        {/* Tóc sau & Bím tóc */}
        <path d="M12 28C8 38 10 50 16 54C19 50 18 40 19 32" fill="url(#tohruHairGrad)" />
        <path d="M52 28C56 38 54 50 48 54C45 50 46 40 45 32" fill="url(#tohruHairGrad)" />

        {/* Sừng rồng cong vút 2 bên */}
        <path
          d="M19 22C14 12 11 4 19 2C21 8 23 14 26 20"
          fill="url(#tohruHornGrad)"
          stroke="#78350f"
          strokeWidth="1.2"
          strokeLinejoin="round"
        />
        <path
          d="M45 22C50 12 53 4 45 2C43 8 41 14 38 20"
          fill="url(#tohruHornGrad)"
          stroke="#78350f"
          strokeWidth="1.2"
          strokeLinejoin="round"
        />
        {/* Vằn trên sừng rồng */}
        <path d="M16 9C18 10 19 11 20 12" stroke="#78350f" strokeWidth="1" strokeLinecap="round" />
        <path d="M48 9C46 10 45 11 44 12" stroke="#78350f" strokeWidth="1" strokeLinecap="round" />

        {/* Khuôn mặt chibi tròn trĩnh */}
        <ellipse cx="32" cy="36" rx="19" ry="17" fill="#fff1f2" />

        {/* Cổ áo & Nơ hầu gái đỏ */}
        <path d="M22 51C26 53 38 53 42 51L44 60H20L22 51Z" fill="#1e293b" />
        <path d="M26 51L32 55L38 51L32 49L26 51Z" fill="#ffffff" />
        {/* Nơ đỏ */}
        <path d="M32 53L27 50C26 53 28 56 32 54L37 50C38 53 36 56 32 54Z" fill="#e11d48" />
        <circle cx="32" cy="53" r="1.8" fill="#fbbf24" />

        {/* Mái tóc vàng óng của Tohru */}
        <path
          d="M14 28C14 20 22 16 32 16C42 16 50 20 50 28C48 26 44 26 41 28C38 25 35 25 32 28C29 25 26 25 23 28C20 26 16 26 14 28Z"
          fill="url(#tohruHairGrad)"
        />
        {/* Tóc mai buông 2 bên má */}
        <path d="M14 26C13 34 14 44 18 47C17 40 16 33 17 26" fill="url(#tohruHairGrad)" />
        <path d="M50 26C51 34 50 44 46 47C47 40 48 33 47 26" fill="url(#tohruHairGrad)" />

        {/* Băng đô ren trắng hầu gái (Maid Headband) */}
        <path
          d="M20 18C23 15 27 14 32 14C37 14 41 15 44 18"
          stroke="#ffffff"
          strokeWidth="3.5"
          strokeLinecap="round"
        />
        <path
          d="M19 18C22 14 26 13 32 13C38 13 42 14 45 18"
          stroke="#cbd5e1"
          strokeWidth="1.2"
          strokeDasharray="2 2"
        />

        {/* Đôi mắt Anime to tròn lấp lánh */}
        {emotion === 'wink' ? (
          <>
            {/* Mắt trái mở to */}
            <ellipse cx="25" cy="35" rx="3.5" ry="5.5" fill="url(#tohruEyeGrad)" />
            <circle cx="24" cy="33" r="1.6" fill="#ffffff" />
            <circle cx="26" cy="37" r="0.8" fill="#ffffff" />
            {/* Mắt phải nháy wink ^ */}
            <path d="M37 36Q40 32 43 36" stroke="#991b1b" strokeWidth="2.2" strokeLinecap="round" />
          </>
        ) : emotion === 'love' ? (
          <>
            {/* Mắt hình trái tim yêu thương */}
            <path d="M25 34C23 31 20 33 21 35C22 37 25 40 25 40C25 40 28 37 29 35C30 33 27 31 25 34Z" fill="#e11d48" />
            <path d="M39 34C37 31 34 33 35 35C36 37 39 40 39 40C39 40 42 37 43 35C44 33 41 31 39 34Z" fill="#e11d48" />
          </>
        ) : (
          <>
            {/* Đôi mắt bình thường siêu cute */}
            <ellipse cx="25" cy="35" rx="3.6" ry="5.8" fill="url(#tohruEyeGrad)" />
            <circle cx="24" cy="33" r="1.6" fill="#ffffff" />
            <circle cx="26.2" cy="37.5" r="0.9" fill="#ffffff" />

            <ellipse cx="39" cy="35" rx="3.6" ry="5.8" fill="url(#tohruEyeGrad)" />
            <circle cx="38" cy="33" r="1.6" fill="#ffffff" />
            <circle cx="40.2" cy="37.5" r="0.9" fill="#ffffff" />
          </>
        )}

        {/* Má hồng chúm chím anime */}
        <ellipse cx="19" cy="39" rx="3" ry="1.8" fill="#fda4af" opacity="0.85" />
        <ellipse cx="45" cy="39" rx="3" ry="1.8" fill="#fda4af" opacity="0.85" />

        {/* Miệng cười xinh xắn */}
        <path d="M29.5 41.5Q32 44.5 34.5 41.5" stroke="#be123c" strokeWidth="1.8" strokeLinecap="round" />
      </svg>
    </div>
  )
}

// Vòng Ma Pháp Triệu Hồi Rồng Cỡ Lớn (Dragon Summoning Circle)
export function TohruMagicCircleLarge({ size = 180, className = '' }) {
  return (
    <div className={`relative inline-flex items-center justify-center pointer-events-none select-none ${className}`} style={{ width: size, height: size }}>
      <svg
        width={size}
        height={size}
        viewBox="0 0 200 200"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="animate-[spin_24s_linear_infinite]"
      >
        <circle cx="100" cy="100" r="95" stroke="currentColor" strokeWidth="2" strokeOpacity="0.4" />
        <circle cx="100" cy="100" r="90" stroke="currentColor" strokeWidth="1" strokeDasharray="3 4" strokeOpacity="0.6" />
        <circle cx="100" cy="100" r="76" stroke="currentColor" strokeWidth="1.5" strokeOpacity="0.5" />
        <circle cx="100" cy="100" r="55" stroke="currentColor" strokeWidth="1" strokeDasharray="6 6" strokeOpacity="0.7" />
        <circle cx="100" cy="100" r="28" stroke="currentColor" strokeWidth="1.5" strokeOpacity="0.6" />

        {/* Ngôi sao bát giác cổ xưa */}
        <polygon points="100,10 163,163 10,73 190,73 37,163" stroke="currentColor" strokeWidth="1.2" strokeOpacity="0.5" fill="none" />
        <polygon points="100,190 37,37 190,127 10,127 163,37" stroke="currentColor" strokeWidth="1.2" strokeOpacity="0.5" fill="none" />

        {/* Ký tự ma pháp rồng Tohru */}
        <circle cx="100" cy="24" r="4" fill="currentColor" fillOpacity="0.6" />
        <circle cx="100" cy="176" r="4" fill="currentColor" fillOpacity="0.6" />
        <circle cx="24" cy="100" r="4" fill="currentColor" fillOpacity="0.6" />
        <circle cx="176" cy="100" r="4" fill="currentColor" fillOpacity="0.6" />
        <circle cx="46" cy="46" r="3" fill="currentColor" fillOpacity="0.5" />
        <circle cx="154" cy="46" r="3" fill="currentColor" fillOpacity="0.5" />
        <circle cx="46" cy="154" r="3" fill="currentColor" fillOpacity="0.5" />
        <circle cx="154" cy="154" r="3" fill="currentColor" fillOpacity="0.5" />
      </svg>
    </div>
  )
}

// Chibi Avatar Kanna Kamui (Tóc trắng sừng sọc điện)
export function KannaChibiAvatar({ size = 56 }) {
  return (
    <div className="relative inline-flex items-center justify-center select-none" style={{ width: size, height: size }}>
      <svg width={size} height={size} viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
        {/* Tóc sau màu trắng tím */}
        <ellipse cx="32" cy="38" rx="26" ry="24" fill="#ede9fe" />
        {/* Bím tóc hạt chuỗi tròn đặc trưng Kanna */}
        <circle cx="12" cy="42" r="5" fill="#c084fc" />
        <circle cx="10" cy="51" r="4.5" fill="#c084fc" />
        <circle cx="52" cy="42" r="5" fill="#c084fc" />
        <circle cx="54" cy="51" r="4.5" fill="#c084fc" />
        {/* Sừng điện lông nhung Kanna */}
        <path d="M18 20C16 13 19 8 23 7C24 10 24 15 22 20" stroke="#7e22ce" strokeWidth="2.4" strokeLinecap="round" />
        <path d="M46 20C48 13 45 8 41 7C40 10 40 15 42 20" stroke="#7e22ce" strokeWidth="2.4" strokeLinecap="round" />
        {/* Khuôn mặt */}
        <ellipse cx="32" cy="36" rx="19" ry="16" fill="#fff1f2" />
        {/* Tóc mái bằng Kanna */}
        <path d="M16 26C20 33 26 31 32 30C38 31 44 33 48 26C45 22 39 20 32 20C25 20 19 22 16 26Z" fill="#f5f3ff" />
        {/* Mắt to tròn màu lam tím ngây thơ */}
        <ellipse cx="25" cy="37" rx="3.6" ry="5.5" fill="#6366f1" />
        <circle cx="24" cy="35" r="1.6" fill="#ffffff" />
        <circle cx="26" cy="39" r="0.8" fill="#ffffff" />
        <ellipse cx="39" cy="37" rx="3.6" ry="5.5" fill="#6366f1" />
        <circle cx="38" cy="35" r="1.6" fill="#ffffff" />
        <circle cx="40" cy="39" r="0.8" fill="#ffffff" />
        {/* Má hồng chuỗi */}
        <ellipse cx="19" cy="40" rx="2.8" ry="1.6" fill="#f472b6" opacity="0.9" />
        <ellipse cx="45" cy="40" rx="2.8" ry="1.6" fill="#f472b6" opacity="0.9" />
        {/* Miệng nhỏ xíu cute */}
        <circle cx="32" cy="43" r="1.2" fill="#be185d" />
      </svg>
    </div>
  )
}

// Chibi Avatar Elma (Sừng đơn nâu xoắn & khăn quàng biển)
export function ElmaChibiAvatar({ size = 56 }) {
  return (
    <div className="relative inline-flex items-center justify-center select-none" style={{ width: size, height: size }}>
      <svg width={size} height={size} viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
        {/* Tóc đen tím sau */}
        <ellipse cx="32" cy="38" rx="26" ry="24" fill="#1e1b4b" />
        {/* Sừng đơn giữa trán Elma */}
        <path d="M32 22C31 14 34 8 36 6C37 11 36 17 34 22" stroke="#b45309" strokeWidth="3" strokeLinecap="round" />
        {/* Khuôn mặt */}
        <ellipse cx="32" cy="36" rx="19" ry="16" fill="#fff1f2" />
        {/* Mắt xanh ngọc biển đam mê đồ ăn */}
        <ellipse cx="25" cy="37" rx="3.5" ry="5.2" fill="#06b6d4" />
        <circle cx="24" cy="35" r="1.6" fill="#ffffff" />
        <ellipse cx="39" cy="37" rx="3.5" ry="5.2" fill="#06b6d4" />
        <circle cx="38" cy="35" r="1.6" fill="#ffffff" />
        {/* Má hồng */}
        <ellipse cx="19" cy="40" rx="2.8" ry="1.6" fill="#fb7185" opacity="0.8" />
        <ellipse cx="45" cy="40" rx="2.8" ry="1.6" fill="#fb7185" opacity="0.8" />
        {/* Miệng há to thèm ăn */}
        <path d="M29.5 42C30.5 45 33.5 45 34.5 42" stroke="#b91c1c" strokeWidth="2" strokeLinecap="round" />
        {/* Bánh taiyaki / ngọt ngào trên má */}
        <circle cx="48" cy="48" r="4" fill="#f59e0b" />
      </svg>
    </div>
  )
}

// Chibi Avatar Lucoa (Sừng cong to lớn, tóc vàng xanh)
export function LucoaChibiAvatar({ size = 56 }) {
  return (
    <div className="relative inline-flex items-center justify-center select-none" style={{ width: size, height: size }}>
      <svg width={size} height={size} viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
        {/* Tóc dài vàng xanh rực rỡ */}
        <ellipse cx="32" cy="38" rx="27" ry="25" fill="#fef08a" />
        {/* Cặp sừng rồng khổng lồ uốn lượn phong cách thần thoại Aztec */}
        <path d="M14 24C10 16 8 8 14 5C17 11 18 18 18 24" stroke="#047857" strokeWidth="3" strokeLinecap="round" />
        <path d="M50 24C54 16 56 8 50 5C47 11 46 18 46 24" stroke="#047857" strokeWidth="3" strokeLinecap="round" />
        {/* Khuôn mặt */}
        <ellipse cx="32" cy="36" rx="19" ry="16" fill="#fff1f2" />
        {/* Mắt dị sắc (Heterochromia: một xanh lá, một đen vàng) nhắm tít nụ cười hiền hậu */}
        <path d="M22 36Q25 33 28 36" stroke="#059669" strokeWidth="2.2" strokeLinecap="round" />
        <path d="M36 36Q39 33 42 36" stroke="#d97706" strokeWidth="2.2" strokeLinecap="round" />
        {/* Má hồng */}
        <ellipse cx="19" cy="40" rx="3" ry="1.8" fill="#fda4af" opacity="0.9" />
        <ellipse cx="45" cy="40" rx="3" ry="1.8" fill="#fda4af" opacity="0.9" />
        {/* Nụ cười tươi ấm áp */}
        <path d="M29 42Q32 45 35 42" stroke="#be123c" strokeWidth="2" strokeLinecap="round" />
      </svg>
    </div>
  )
}

// Chibi Avatar Fafnir (Áo đen, kính mắt, sừng hắc long ngầu lòi)
export function FafnirChibiAvatar({ size = 56 }) {
  return (
    <div className="relative inline-flex items-center justify-center select-none" style={{ width: size, height: size }}>
      <svg width={size} height={size} viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
        {/* Tóc đen vuốt ngược */}
        <ellipse cx="32" cy="38" rx="26" ry="24" fill="#0f172a" />
        {/* Cặp sừng hắc long sắc nhọn */}
        <path d="M16 22L12 8L20 18" stroke="#475569" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M48 22L52 8L44 18" stroke="#475569" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" />
        {/* Khuôn mặt */}
        <ellipse cx="32" cy="36" rx="19" ry="16" fill="#f8fafc" />
        {/* Mắt đỏ rực sau kính mắt game thủ */}
        <rect x="20" y="32" width="10" height="8" rx="2" stroke="#e2e8f0" strokeWidth="1.5" fill="#1e293b" />
        <rect x="34" y="32" width="10" height="8" rx="2" stroke="#e2e8f0" strokeWidth="1.5" fill="#1e293b" />
        <line x1="30" y1="36" x2="34" y2="36" stroke="#e2e8f0" strokeWidth="1.5" />
        <circle cx="25" cy="36" r="1.5" fill="#ef4444" />
        <circle cx="39" cy="36" r="1.5" fill="#ef4444" />
        {/* Miệng lạnh lùng gamer */}
        <line x1="28" y1="45" x2="36" y2="45" stroke="#334155" strokeWidth="2" strokeLinecap="round" />
      </svg>
    </div>
  )
}

// Radar Quét Đa Chiều (Dragon Radar Icon)
export function DragonRadarIcon({ size = 20, className = '', color = 'currentColor' }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
      <circle cx="12" cy="12" r="9.5" stroke={color} strokeWidth="1.6" strokeOpacity="0.8" />
      <circle cx="12" cy="12" r="6" stroke={color} strokeWidth="1.2" strokeOpacity="0.5" strokeDasharray="2 2" />
      <circle cx="12" cy="12" r="2.5" fill={color} />
      <line x1="12" y1="2.5" x2="12" y2="21.5" stroke={color} strokeWidth="1" strokeOpacity="0.4" />
      <line x1="2.5" y1="12" x2="21.5" y2="12" stroke={color} strokeWidth="1" strokeOpacity="0.4" />
      <path d="M12 12L19 7" stroke={color} strokeWidth="1.8" strokeLinecap="round" />
      <circle cx="17" cy="6" r="1.5" fill={color} />
      <circle cx="7" cy="16" r="1.2" fill={color} fillOpacity="0.6" />
    </svg>
  )
}

// Lõi Vi Xử Lý Rồng (Dragon CPU Matrix Icon)
export function DragonCpuMatrixIcon({ size = 20, className = '', color = 'currentColor' }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
      <rect x="5" y="5" width="14" height="14" rx="3" stroke={color} strokeWidth="1.8" />
      <path d="M9 9H15V15H9V9Z" fill="currentColor" fillOpacity="0.25" stroke={color} strokeWidth="1.4" />
      <line x1="9" y1="2" x2="9" y2="5" stroke={color} strokeWidth="1.6" strokeLinecap="round" />
      <line x1="15" y1="2" x2="15" y2="5" stroke={color} strokeWidth="1.6" strokeLinecap="round" />
      <line x1="9" y1="19" x2="9" y2="22" stroke={color} strokeWidth="1.6" strokeLinecap="round" />
      <line x1="15" y1="19" x2="15" y2="22" stroke={color} strokeWidth="1.6" strokeLinecap="round" />
      <line x1="2" y1="9" x2="5" y2="9" stroke={color} strokeWidth="1.6" strokeLinecap="round" />
      <line x1="2" y1="15" x2="5" y2="15" stroke={color} strokeWidth="1.6" strokeLinecap="round" />
      <line x1="19" y1="9" x2="22" y2="9" stroke={color} strokeWidth="1.6" strokeLinecap="round" />
      <line x1="19" y1="15" x2="22" y2="15" stroke={color} strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  )
}

// Máy Đo Từ Trường / Sparkline Wave (Dragon Telemetry Icon)
export function DragonTelemetryIcon({ size = 20, className = '', color = 'currentColor' }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
      <rect x="3" y="4" width="18" height="16" rx="3" stroke={color} strokeWidth="1.6" />
      <path d="M3 13H7L9 8L12 17L15 11L17 14H21" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx="12" cy="17" r="1.5" fill={color} />
    </svg>
  )
}

// Bộ Đo Đồng Hồ Ma Lực RAM (Dragon Memory Gauge Icon)
export function DragonMemoryGaugeIcon({ size = 20, className = '', color = 'currentColor' }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
      <path d="M4 16C4 11.5817 7.58172 8 12 8C16.4183 8 20 11.5817 20 16" stroke={color} strokeWidth="2" strokeLinecap="round" />
      <circle cx="12" cy="16" r="2.5" fill={color} />
      <path d="M12 16L17 11" stroke={color} strokeWidth="2" strokeLinecap="round" />
      <line x1="6" y1="16" x2="7.5" y2="16" stroke={color} strokeWidth="1.5" strokeLinecap="round" />
      <line x1="12" y1="10" x2="12" y2="11.5" stroke={color} strokeWidth="1.5" strokeLinecap="round" />
      <line x1="18" y1="16" x2="16.5" y2="16" stroke={color} strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  )
}

// Lá Chắn Ma Trận Năng Lượng (Dragon Shield Matrix Icon)
export function DragonShieldMatrixIcon({ size = 20, className = '', color = 'currentColor' }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
      <path d="M12 3L20 6.5V12C20 16.5 16.5 20.5 12 21.5C7.5 20.5 4 16.5 4 12V6.5L12 3Z" stroke={color} strokeWidth="1.8" strokeLinejoin="round" />
      <path d="M12 7L16 9.5V13C16 15.5 14.3 17.5 12 18.5C9.7 17.5 8 15.5 8 13V9.5L12 7Z" fill="currentColor" fillOpacity="0.25" stroke={color} strokeWidth="1.4" />
      <circle cx="12" cy="13" r="1.5" fill={color} />
    </svg>
  )
}

// Cột Sóng Âm Visualizer (Dragon Sound Wave Icon)
export function DragonSoundWaveIcon({ size = 20, className = '', color = 'currentColor' }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
      <line x1="4" y1="10" x2="4" y2="14" stroke={color} strokeWidth="2" strokeLinecap="round" />
      <line x1="8" y1="6" x2="8" y2="18" stroke={color} strokeWidth="2" strokeLinecap="round" />
      <line x1="12" y1="3" x2="12" y2="21" stroke={color} strokeWidth="2" strokeLinecap="round" />
      <line x1="16" y1="8" x2="16" y2="16" stroke={color} strokeWidth="2" strokeLinecap="round" />
      <line x1="20" y1="11" x2="20" y2="13" stroke={color} strokeWidth="2" strokeLinecap="round" />
    </svg>
  )
}
