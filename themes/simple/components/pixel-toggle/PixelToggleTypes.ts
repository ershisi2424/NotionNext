import type { MotionOptions } from "./motion-runtime";
export type PixelToggleOptions = MotionOptions & { checked?: boolean; sound?: boolean; onCheckedChange?: (checked: boolean) => void };
