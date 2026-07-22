declare module '@3d-dice/dice-box' {
  export interface DiceBoxConfig {
    assetPath: string;
    container?: string;
    gravity?: number;
    mass?: number;
    friction?: number;
    restitution?: number;
    angularDamping?: number;
    linearDamping?: number;
    spinForce?: number;
    throwForce?: number;
    startingHeight?: number;
    settleTimeout?: number;
    offscreen?: boolean;
    lightIntensity?: number;
    enableShadows?: boolean;
    shadowTransparency?: number;
    theme?: string;
    themeColor?: string;
    scale?: number;
    suspendSimulation?: boolean;
  }

  export interface DiceResult {
    value: number;
  }

  export interface DiceRollGroup {
    value: number;
    rolls: DiceResult[];
  }

  export default class DiceBox {
    constructor(config: DiceBoxConfig);
    init(): Promise<void>;
    roll(notation: string | {qty?: number; sides: number}): Promise<DiceRollGroup[]>;
    clear(): void;
  }
}
