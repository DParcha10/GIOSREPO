import { useEffect, useState, useRef } from 'react'
import { motion } from 'framer-motion'

/**
 * DecryptedText Component
 * Inspired by React Bits
 * A text animation that reveals the text by cycling through random characters.
 * 
 * @param {string} text - The final text to display
 * @param {boolean} [animateOnHover=false] - Whether to trigger the animation on hover
 * @param {number} [speed=50] - Speed of the decryption in ms
 * @param {string} [className=""] - Additional CSS classes
 */
export default function DecryptedText({ 
  text, 
  animateOnHover = false, 
  speed = 50, 
  className = "",
  animateOnLoad = true 
}) {
  const [displayText, setDisplayText] = useState(text.replace(/./g, '-'))
  const [isRevealing, setIsRevealing] = useState(false)
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*()_+'
  const timerRef = useRef(null)

  const revealText = () => {
    if (isRevealing) return
    setIsRevealing(true)
    let iteration = 0
    
    clearInterval(timerRef.current)
    
    timerRef.current = setInterval(() => {
      setDisplayText(
        text.split("")
          .map((char, index) => {
            if (index < iteration) return text[index]
            if (char === " ") return " "
            return chars[Math.floor(Math.random() * chars.length)]
          })
          .join("")
      )
      
      if (iteration >= text.length) {
        clearInterval(timerRef.current)
        setIsRevealing(false)
      }
      
      iteration += 1/3
    }, speed)
  }

  useEffect(() => {
    if (animateOnLoad) {
      const timeout = setTimeout(() => revealText(), 0);
      return () => {
        clearTimeout(timeout);
        clearInterval(timerRef.current);
      };
    }
    return () => clearInterval(timerRef.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [text, animateOnLoad])

  const handleMouseEnter = () => {
    if (animateOnHover) revealText()
  }

  const handleMouseLeave = () => {}

  return (
    <motion.span 
      className={`font-mono ${className}`}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      {displayText}
    </motion.span>
  )
}
