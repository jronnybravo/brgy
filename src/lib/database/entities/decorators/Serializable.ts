import { instanceToPlain } from "class-transformer";

export function Serializable(options: Parameters<typeof instanceToPlain>[1] = {}) {
    return function (constructor: Function) {
        constructor.prototype.toJSON = function () {
            return instanceToPlain(this, {
                strategy: "exposeAll",
                enableCircularCheck: true,
                ...options,
            });
        };
    };
}