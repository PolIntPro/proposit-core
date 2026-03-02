export const POSITION_MIN = 0
export const POSITION_MAX = Number.MAX_SAFE_INTEGER
export const POSITION_INITIAL = Math.floor(POSITION_MAX / 2)

export function midpoint(a: number, b: number): number {
    return a + (b - a) / 2
}
