import sadCappy from '../../assets/sad_cappy.PNG'
import superSadCappy from '../../assets/super_sad_cappy.PNG'
import happyCappy from '../../assets/happy_cappy.PNG'
import superHappyCappy from '../../assets/super_happy_cap.PNG'

interface CapybaraState {
  image: string
  alt: string
  message: string
}

export function getCapybaraState(streakCount: number, daysSinceLastCheckin: number): CapybaraState {
  if (streakCount === 0 && daysSinceLastCheckin > 7) {
    return {
      image: superSadCappy,
      alt: 'Sam the capybara looking very sad and missing you',
      message: "Sam really misses you...",
    }
  }
  if (streakCount === 0) {
    return {
      image: sadCappy,
      alt: 'Sam the capybara looking sad and waiting for you',
      message: "Sam misses you...",
    }
  }
  if (streakCount <= 7) {
    return {
      image: happyCappy,
      alt: 'Sam the capybara smiling happily at your progress',
      message: "Sam says good job!",
    }
  }
  return {
    image: superHappyCappy,
    alt: 'Sam the capybara celebrating your amazing streak',
    message: "Sam is so proud of you!",
  }
}

interface MascotPanelProps {
  streakCount: number
  daysSinceLastCheckin: number
}

export default function MascotPanel({ streakCount, daysSinceLastCheckin }: MascotPanelProps) {
  const { image, alt, message } = getCapybaraState(streakCount, daysSinceLastCheckin)

  return (
    <div className="fade-up fade-up-1 flex flex-col items-center text-center">
      <img
        src={image}
        alt={alt}
        className="w-full max-w-[280px] object-contain drop-shadow-sm"
      />
      <p
        className="mt-3 text-2xl text-nn-deep-blue leading-snug px-2"
        style={{ fontFamily: "'Caveat', cursive", fontWeight: 700 }}
      >
        {message}
      </p>
    </div>
  )
}
