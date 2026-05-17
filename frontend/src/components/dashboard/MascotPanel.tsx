import sadCappy from '../../assets/sad_cappy.PNG'
import superSadCappy from '../../assets/super_sad_cappy.PNG'
import happyCappy from '../../assets/happy_cappy.PNG'
import superHappyCappy from '../../assets/super_happy_cap.PNG'

interface CapybaraState {
  image: string
  alt: string
  message: string
}

export function getCapybaraState(mascotHealth: number): CapybaraState {
  if (mascotHealth <= 25) {
    return {
      image: superSadCappy,
      alt: 'Sam the capybara looking very sad',
      message: "Sam is very sad...",
    }
  }
  if (mascotHealth <= 50) {
    return {
      image: sadCappy,
      alt: 'Sam the capybara looking sad',
      message: "Sam misses you...",
    }
  }
  if (mascotHealth <= 75) {
    return {
      image: happyCappy,
      alt: 'Sam the capybara smiling happily',
      message: "Sam is happy to see you!",
    }
  }
  return {
    image: superHappyCappy,
    alt: 'Sam the capybara celebrating',
    message: "Sam is so proud of you!",
  }
}

interface MascotPanelProps {
  mascotHealth: number
}

export default function MascotPanel({ mascotHealth }: MascotPanelProps) {
  const { image, alt, message } = getCapybaraState(mascotHealth)

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
      <div className="mt-2 w-full max-w-[200px]">
        <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-emerald-400 to-emerald-600 transition-all duration-500"
            style={{ width: `${mascotHealth}%` }}
          />
        </div>
        <p className="text-xs text-nn-navy-light mt-1">Health: {mascotHealth}/100</p>
      </div>
    </div>
  )
}
