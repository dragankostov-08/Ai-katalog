import { describe, expect, it } from 'vitest'
import { formatDuration, parseYouTubeId } from './youtube'

describe('parseYouTubeId', () => {
  it.each([
    ['https://www.youtube.com/watch?v=dQw4w9WgXcQ&t=42s', 'dQw4w9WgXcQ'],
    ['https://youtu.be/dQw4w9WgXcQ?si=abc', 'dQw4w9WgXcQ'],
    ['https://m.youtube.com/watch?v=dQw4w9WgXcQ', 'dQw4w9WgXcQ'],
    ['https://www.youtube.com/shorts/dQw4w9WgXcQ', 'dQw4w9WgXcQ'],
    ['https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ', 'dQw4w9WgXcQ'],
    ['youtube.com/watch?v=dQw4w9WgXcQ', 'dQw4w9WgXcQ'],
    ['dQw4w9WgXcQ', 'dQw4w9WgXcQ'],
  ])('%s', (input, id) => expect(parseYouTubeId(input)).toBe(id))

  it('rejects other hosts and malformed ids', () => {
    expect(parseYouTubeId('https://evil.com/watch?v=dQw4w9WgXcQ')).toBeNull()
    expect(parseYouTubeId('https://youtube.com/watch?v=short')).toBeNull()
    expect(parseYouTubeId('javascript:alert(1)')).toBeNull()
  })
})

describe('formatDuration', () => {
  it('formats minutes and hours', () => {
    expect(formatDuration(125)).toBe('2:05')
    expect(formatDuration(3723)).toBe('1:02:03')
    expect(formatDuration(null)).toBe('')
  })
})
