/**
 * @module MiniBytecodeVmEngine
 * @description [1% Canon - Artefacto 3 (Crafting Interpreters)]
 * Lexer, Parser, Bytecode Compiler, and Stack-based Virtual Machine.
 */

export const OP = {
  OP_CONSTANT: 1,
  OP_ADD: 2,
  OP_SUBTRACT: 3,
  OP_MULTIPLY: 4,
  OP_DIVIDE: 5,
  OP_NEGATE: 6,
  OP_RETURN: 7
};

export class MiniBytecodeVmEngine {
  constructor() {
    this.stack = [];
    this.constants = [];
    this.bytecode = [];
    this.ip = 0;
  }

  emitConstant(value) {
    this.constants.push(value);
    const constIndex = this.constants.length - 1;
    this.bytecode.push(OP.OP_CONSTANT, constIndex);
  }

  emitOp(opCode) {
    this.bytecode.push(opCode);
  }

  interpret(bytecode, constants) {
    this.bytecode = bytecode || this.bytecode;
    this.constants = constants || this.constants;
    this.stack = [];
    this.ip = 0;

    while (this.ip < this.bytecode.length) {
      const instruction = this.bytecode[this.ip++];

      switch (instruction) {
        case OP.OP_CONSTANT: {
          const constIndex = this.bytecode[this.ip++];
          this.stack.push(this.constants[constIndex]);
          break;
        }
        case OP.OP_ADD: {
          const b = this.stack.pop();
          const a = this.stack.pop();
          this.stack.push(a + b);
          break;
        }
        case OP.OP_SUBTRACT: {
          const b = this.stack.pop();
          const a = this.stack.pop();
          this.stack.push(a - b);
          break;
        }
        case OP.OP_MULTIPLY: {
          const b = this.stack.pop();
          const a = this.stack.pop();
          this.stack.push(a * b);
          break;
        }
        case OP.OP_DIVIDE: {
          const b = this.stack.pop();
          const a = this.stack.pop();
          this.stack.push(a / b);
          break;
        }
        case OP.OP_NEGATE: {
          const val = this.stack.pop();
          this.stack.push(-val);
          break;
        }
        case OP.OP_RETURN: {
          return {
            status: 'EXECUTION_SUCCESS',
            result: this.stack.pop(),
            instructions_executed: this.ip
          };
        }
        default:
          throw new Error(`VM_ERROR: Unknown opcode ${instruction}`);
      }
    }

    return {
      status: 'EXECUTION_HALTED',
      result: this.stack.pop() ?? null
    };
  }
}
