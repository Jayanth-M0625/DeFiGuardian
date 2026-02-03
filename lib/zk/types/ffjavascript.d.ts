declare module 'ffjavascript' {
  export namespace utils {
    export function leBuff2int(buff: Buffer): bigint;
    export function leInt2Buff(n: bigint, len: number): Buffer;
    export function stringifyBigInts(obj: any): any;
    export function unstringifyBigInts(obj: any): any;
  }
  export namespace Scalar {
    export function fromString(s: string, radix?: number): bigint;
    export function toString(n: bigint, radix?: number): string;
    export function e(n: number | bigint | string): bigint;
  }
}