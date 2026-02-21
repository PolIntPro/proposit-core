import type { TPropositionalRelation } from "./schemata"

export function createRelationUUID(
    relation: Pick<TPropositionalRelation, "sourceId" | "targetId">
): string {
    return `${relation.sourceId}:${relation.targetId}`
}

export function parseRelationUUID(
    uuid: string
): Pick<TPropositionalRelation, "sourceId" | "targetId"> {
    const [sourceId, targetId] = uuid.split(":")
    return {
        sourceId,
        targetId,
    }
}

type DefaultValueFactory<K, V> = (key?: K) => V
export class DefaultMap<K, V> extends Map<K, V> {
    private mkDefault: DefaultValueFactory<K, V>
    private limit: number

    constructor(
        mkDefault: DefaultValueFactory<K, V>,
        entries?: Iterable<[K, V]>,
        limit = -1
    ) {
        /**
         * mkDefault is a function which (optionally) takes one argument, a value passed as the key,
         * and returns a value which to use if that key is not present in the map. The function may
         * throw an error if the key is invalid or forbidden to limit the scope of values in the map.
         */
        super(entries)
        this.mkDefault = mkDefault
        this.limit = limit
    }

    public get(key: K): V {
        if (!this.has(key)) {
            this.set(key, this.mkDefault(key))
        }
        return super.get(key)!
    }

    public set(key: K, value: V) {
        if (this.limit >= 0 && this.size + 1 >= this.limit) {
            // Remove the oldest entry when the limit is reached
            // This implementation uses the first entry, which is the oldest in insertion order
            const oldestKey = this.keys().next().value
            if (oldestKey !== undefined) this.delete(oldestKey)
        }
        return super.set(key, value)
    }
}
