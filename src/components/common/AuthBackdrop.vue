<template>
  <div class="auth-bg" aria-hidden="true">
    <svg class="bg-art" viewBox="0 0 1440 900" preserveAspectRatio="xMidYMid slice">
      <defs>
        <pattern id="auth-iso" width="64" height="32" patternUnits="userSpaceOnUse">
          <path class="iso-top" d="M32 0 L64 16 L32 32 L0 16 Z" />
          <path class="iso-left" d="M0 16 L32 32 L32 48 L0 32 Z" />
          <path class="iso-left" d="M0 -16 L32 0 L32 16 L0 0 Z" />
          <path class="iso-right" d="M32 32 L64 16 L64 32 L32 48 Z" />
          <path class="iso-right" d="M32 0 L64 -16 L64 0 L32 16 Z" />
        </pattern>
        <radialGradient id="auth-halo" cx="50%" cy="50%" r="50%">
          <stop offset="0%" class="stop-halo-0" />
          <stop offset="100%" class="stop-halo-1" />
        </radialGradient>
      </defs>

      <rect class="art-iso-field" x="0" y="0" width="1440" height="900" fill="url(#auth-iso)" />

      <g class="ring-cluster">
        <ellipse class="art-halo" cx="1150" cy="300" rx="430" ry="430" fill="url(#auth-halo)" />
        <g class="art-rings">
          <circle class="ring ring-1" cx="1150" cy="300" r="212" />
          <circle class="ring ring-2" cx="1150" cy="300" r="156" />
          <circle class="ring ring-3" cx="1150" cy="300" r="104" />
          <g class="ring-spin">
            <circle class="ring ring-4" cx="1150" cy="300" r="56" stroke-dasharray="152 96" />
          </g>
          <circle class="ring-core" cx="1150" cy="300" r="9" />
        </g>
      </g>
    </svg>
    <div class="bg-glow"></div>
  </div>
</template>

<style scoped>
.auth-bg {
  position: absolute;
  inset: 0;
  pointer-events: none;
  overflow: hidden;
}
.bg-art {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  display: block;
}

.art-iso-field {
  opacity: 0.9;
}
.iso-top {
  fill: rgba(var(--rgb-gold), 0.07);
}
.iso-left {
  fill: rgba(var(--rgb-gold), 0.04);
}
.iso-right {
  fill: rgba(var(--rgb-gold), 0.02);
}

.ring-cluster {
  transform-box: view-box;
  transform-origin: 1150px 300px;
}
@media (max-width: 760px) {
  .ring-cluster {
    transform: translate(-330px, 40px);
  }
}
.stop-halo-0 {
  stop-color: rgba(var(--rgb-gold), 0.12);
}
.stop-halo-1 {
  stop-color: rgba(var(--rgb-gold), 0);
}
.art-rings .ring {
  fill: none;
  stroke: rgba(var(--rgb-gold), 0.16);
  stroke-linecap: round;
}
.ring-1 {
  stroke-width: 30;
  opacity: 0.35;
}
.ring-2 {
  stroke-width: 22;
  opacity: 0.5;
}
.ring-3 {
  stroke-width: 16;
  opacity: 0.68;
}
.ring-4 {
  stroke-width: 12;
}
.ring-core {
  fill: rgba(var(--rgb-gold), 0.4);
}
.ring-spin {
  transform-box: view-box;
  transform-origin: 1150px 300px;
  animation: auth-ring-spin 88s linear infinite;
}
@keyframes auth-ring-spin {
  to {
    transform: rotate(360deg);
  }
}
@media (prefers-reduced-motion: reduce) {
  .ring-spin {
    animation: none;
  }
}

.bg-glow {
  position: absolute;
  inset: 0;
  background:
    radial-gradient(ellipse 46% 44% at 80% 22%, rgba(var(--rgb-gold), 0.14) 0%, transparent 70%),
    radial-gradient(ellipse 44% 42% at 12% 88%, rgba(var(--rgb-gold), 0.07) 0%, transparent 72%);
}
</style>
