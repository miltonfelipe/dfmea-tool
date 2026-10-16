import { rpnClass } from "../lib/utils.js";

export function RPNChip({value}){return <span className={`rpn ${rpnClass(value)}`}>{value}</span>;}
