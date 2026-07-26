import { useEffect, useRef } from 'react'

interface Petal {
  x: number
  y: number
  size: number
  rotation: number
  rotationSpeed: number
  speedX: number
  speedY: number
  opacity: number
  sway: number
  swaySpeed: number
  swayAmount: number
}

export default function SakuraEffect() {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext('2d')!
    let petals: Petal[] = []
    let animFrame: number
    let width = 0
    let height = 0

    function resize() {
      width = window.innerWidth
      height = window.innerHeight
      canvas!.width = width
      canvas!.height = height
    }
    resize()
    window.addEventListener('resize', resize)

    const TOTAL_PETALS = 25

    function createPetal(): Petal {
      return {
        x: Math.random() * width,
        y: -20 - Math.random() * height * 0.5,
        size: 6 + Math.random() * 10,
        rotation: Math.random() * 360,
        rotationSpeed: (Math.random() - 0.5) * 2,
        speedX: -0.3 + Math.random() * 0.6,
        speedY: 0.5 + Math.random() * 1.2,
        opacity: 0.4 + Math.random() * 0.5,
        sway: 0,
        swaySpeed: 0.01 + Math.random() * 0.03,
        swayAmount: 10 + Math.random() * 30,
      }
    }

    for (let i = 0; i < TOTAL_PETALS; i++) {
      const p = createPetal()
      p.y = Math.random() * height
      petals.push(p)
    }

    function drawPetal(p: Petal) {
      ctx.save()
      ctx.translate(p.x, p.y)
      ctx.rotate((p.rotation * Math.PI) / 180)
      ctx.globalAlpha = p.opacity

      // Draw a sakura petal shape
      const s = p.size
      ctx.fillStyle = 'hsl(340, 60%, 75%)'
      ctx.shadowColor = 'hsla(340, 60%, 70%, 0.3)'
      ctx.shadowBlur = 6

      ctx.beginPath()
      ctx.moveTo(0, -s)
      ctx.bezierCurveTo(s * 0.6, -s * 0.6, s * 0.8, -s * 0.2, 0, s * 0.3)
      ctx.bezierCurveTo(-s * 0.8, -s * 0.2, -s * 0.6, -s * 0.6, 0, -s)
      ctx.closePath()
      ctx.fill()

      ctx.restore()
    }

    function animate() {
      ctx.clearRect(0, 0, width, height)

      for (const p of petals) {
        p.sway += p.swaySpeed
        p.x += p.speedX + Math.sin(p.sway) * 0.3
        p.y += p.speedY
        p.rotation += p.rotationSpeed

        drawPetal(p)

        // Reset when out of bounds
        if (p.y > height + 30 || p.x < -30 || p.x > width + 30) {
          Object.assign(p, createPetal())
        }
      }

      animFrame = requestAnimationFrame(animate)
    }

    animate()

    return () => {
      cancelAnimationFrame(animFrame)
      window.removeEventListener('resize', resize)
      petals = []
    }
  }, [])

  return (
    <canvas
      ref={canvasRef}
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        pointerEvents: 'none',
        zIndex: 9998,
      }}
    />
  )
}
