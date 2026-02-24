import Type, { type TSchema, type TSchemaOptions } from "typebox"

export const Nullable = <T extends TSchema>(
    T: T,
    options?: Omit<TSchemaOptions, "default">
) => {
    return Type.Union([T, Type.Null()], { ...options, default: null })
}
export const UUID = Type.String() // `${string}-${string}-${string}-${string}-${string}`
