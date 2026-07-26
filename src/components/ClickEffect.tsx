import { useEffect } from 'react'

interface Particle {
  x: number
  y: number
  vx: number
  vy: number
  size: number
  color: string
  life: number
  maxLife: number
  rotation: number
  rotationSpeed: number
}

export default function ClickEffect() {
  useEffect(() => {
    const canvas = document.createElement('canvas')
    canvas.id = 'click-effect-canvas'
    canvas.style.cssText = `
      position: fixed; top: 0; left: 0; width: 100%; height: 100%;
      pointer-events: none; z-index: 99999;
    `
    document.body.appendChild(canvas)
    const ctx = canvas.getContext('2d')!
    let particles: Particle[] = []
    let animFrame: number

    function resize() {
      canvas.width = window.innerWidth
      canvas.height = window.innerHeight
    }
    resize()
    window.addEventListener('resize', resize)

    function createParticles(x: number, y: number) {
      const hue = getComputedStyle(document.documentElement)
        .getPropertyValue('--hue')
        ?.trim() || '168'
      const count = 10
      const colors = [
        `hsl(${hue}, 70%, 55%)`,
        `hsl(${Number(hue) + 30}, 65%, 50%)`,
        `hsl(${Number(hue) - 20}, 60%, 60%)`,
        '#fff',
      ]

      for (let i = 0; i < count; i++) {
        const angle = (Math.PI * 2 * i) / count + Math.random() * 0.5
        const speed = 2 + Math.random() * 4
        particles.push({
          x,
          y,
          vx: Math.cos(angle) * speed,
          vy: Math.sin(angle) * speed - 1.5,
          size: 3 + Math.random() * 5,
          color: colors[Math.floor(Math.random() * colors.length)],
          life: 0,
          maxLife: 40 + Math.random() * 30,
          rotation: Math.random() * 360,
          rotationSpeed: (Math.random() - 0.5) * 8,
        })
      }
    }

    function animate() {
      ctx.clearRect(0, 0, canvas.width, canvas.height)
      particles = particles.filter(p => p.life < p.maxLife)

      for (const p of particles) {
        p.x += p.vx
        p.y += p.vy
        p.vy += 0.08
        p.vx *= 0.97
        p.life++
        p.rotation += p.rotationSpeed

        const progress = p.life / p.maxLife
        const alpha = 1 - progress
        const scale = 1 - progress * 0.3

        ctx.save()
        ctx.translate(p.x, p.y)
        ctx.rotate((p.rotation * Math.PI) / 180)
        ctx.scale(scale, scale)
        ctx.globalAlpha = alpha

        // Draw star shape
        const s = p.size
        ctx.fillStyle = p.color
        ctx.shadowColor = p.color
        ctx.shadowBlur = 8

        ctx.beginPath()
        ctx.moveTo(s, 0)
        ctx.lineTo(s * 0.3, s * 0.3)
        ctx.lineTo(0, s)
        ctx.lineTo(-s * 0.3, s * 0.3)
        ctx.lineTo(-s, 0)
        ctx.lineTo(-s * 0.3, -s * 0.3)
        ctx.lineTo(0, -s)
        ctx.lineTo(s * 0.3, -s * 0.3)
        ctx.closePath()
        ctx.fill()

        ctx.restore()
      }

      animFrame = requestAnimationFrame(animate)
    }

    function handleClick(e: MouseEvent) {
      e.stopPropagation()
      createParticles(e.clientX, e.clientY)
    }

    document.addEventListener('click', handleClick)
    animate()

    return () => {
      document.removeEventListener('click', handleClick)
      cancelAnimationFrame(animFrame)
      window.removeEventListener('resize', resize)
      canvas.remove()
      particles = []
    }
  }, [])

  return null
}
