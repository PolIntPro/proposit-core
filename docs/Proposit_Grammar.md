# Proposit Formula Grammar

This document defines the grammar for logical formulas accepted by proposit-core.

## Quick Reference

| Operator | Unicode | ASCII | Arity | Example |
|----------|---------|-------|-------|---------|
| Negation | `¬` | `!` | Unary (prefix) | `¬P` |
| Conjunction | `∧` | `&&` | Binary/n-ary | `P ∧ Q` |
| Disjunction | `∨` | `\|\|` | Binary/n-ary | `P ∨ Q` |
| Implication | `→` | `->` | Binary | `P → Q` |
| Biconditional | `↔` | `<->` | Binary | `P ↔ Q` |

## Operator Precedence

From highest to lowest binding strength:

1. `¬` / `!` (negation) — tightest binding, right-associative prefix
2. `∧` / `&&` (conjunction) — left-associative
3. `∨` / `||` (disjunction) — left-associative
4. `→` / `->` and `↔` / `<->` (implication, biconditional) — lowest precedence, non-associative

Parentheses `( )` override precedence.

## Variables

A variable is any identifier matching the pattern:

```
[A-Za-z_][A-Za-z0-9_]*
```

Valid examples: `P`, `Q`, `Rain`, `is_wet`, `P1`, `myVar`

Variables are case-sensitive: `p` and `P` are distinct variables.

## Grammar

```
formula       ← implication

implication   ← disjunction ( ('→' / '->') disjunction
                             / ('↔' / '<->') disjunction )?

disjunction   ← conjunction ( ('∨' / '||') conjunction )*

conjunction   ← unary ( ('∧' / '&&') unary )*

unary         ← ('¬' / '!') unary
              / atom

atom          ← '(' formula ')'
              / variable

variable      ← [A-Za-z_][A-Za-z0-9_]*
```

Whitespace between tokens is optional and ignored.

## Root-Only Restriction

Implication (`→`) and biconditional (`↔`) may only appear at the **top level** of a formula. They cannot be nested inside other operators or within parentheses.

**Valid:**
```
P → Q
A ∧ B → C ∨ D
¬P ↔ Q
```

**Invalid:**
```
(P → Q) ∧ R        # implication inside parentheses
P ∨ (A ↔ B)        # biconditional inside parentheses
P → Q → R          # chained implications
```

## Examples

### Simple formulas

| Formula | Description |
|---------|-------------|
| `P` | A single variable |
| `¬P` | Negation of P |
| `P ∧ Q` | P and Q |
| `P ∨ Q` | P or Q |
| `P → Q` | P implies Q |
| `P ↔ Q` | P if and only if Q |

### Compound formulas

| Formula | Parsed as |
|---------|-----------|
| `P ∧ Q ∧ R` | Three-way conjunction: and(P, Q, R) |
| `P ∨ Q ∨ R` | Three-way disjunction: or(P, Q, R) |
| `¬P ∧ Q` | (¬P) ∧ Q — negation binds tighter |
| `P ∨ Q ∧ R` | P ∨ (Q ∧ R) — conjunction binds tighter |
| `P ∧ Q → R` | (P ∧ Q) → R — implication is lowest precedence |
| `(P ∨ Q) ∧ R` | Parentheses override precedence |

### ASCII equivalents

| Unicode | ASCII |
|---------|-------|
| `¬P ∧ Q` | `!P && Q` |
| `P ∨ Q → R` | `P \|\| Q -> R` |
| `A ↔ B` | `A <-> B` |
| `!(A \|\| B) && C` | Same as `¬(A ∨ B) ∧ C` |

### Mixed notation

Unicode and ASCII operators may be mixed freely within a formula:

```
¬P && Q || R -> S
```

is equivalent to:

```
¬P ∧ Q ∨ R → S
```

which parses as `((¬P) ∧ Q) ∨ R → S`, i.e., `(((¬P) ∧ Q) ∨ R) → S`.
