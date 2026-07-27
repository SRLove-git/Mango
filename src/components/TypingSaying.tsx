import { useState, useEffect, useRef } from 'react'

const API_URL = 'https://uapis.cn/api/v1/saying'

export default function TypingSaying() {
  const [fullText, setFullText] = useState('')
  const [displayedText, setDisplayedText] = useState('')
  const indexRef = useRef(0)

  useEffect(() => {
    fetch(API_URL)
      .then(res => res.json())
      .then((data: { text: string }) => {
        setFullText(data.text || '')
      })
      .catch(() => {
        setFullText('')
      })
  }, [])

  useEffect(() => {
    if (!fullText) return
    indexRef.current = 0
    setDisplayedText('')

    const timer = setInterval(() => {
      if (indexRef.current < fullText.length) {
        indexRef.current += 1
        setDisplayedText(fullText.slice(0, indexRef.current))
      } else {
        clearInterval(timer)
      }
    }, 120)

    return () => clearInterval(timer)
  }, [fullText])

  if (!displayedText && !fullText) return null

  return (
    <p className="banner-saying">
      {displayedText || fullText}
      <span className="typing-cursor">|</span>
    </p>
  )
}
