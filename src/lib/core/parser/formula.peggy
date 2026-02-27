{{
// AST node constructors used by grammar actions
function variableNode(name) {
  return { type: "variable", name };
}
function notNode(operand) {
  return { type: "not", operand };
}
function binaryNode(type, left, right) {
  return { type, left, right };
}
function naryNode(type, first, rest) {
  if (rest.length === 0) return first;
  return { type, operands: [first, ...rest] };
}
}}

Formula
  = _ expr:Implication _ { return expr; }

Implication
  = left:Disjunction _ op:("→" / "->" / "↔" / "<->") _ right:Disjunction {
      const type = (op === "→" || op === "->") ? "implies" : "iff";
      return binaryNode(type, left, right);
    }
  / Disjunction

Disjunction
  = first:Conjunction rest:(_ ("∨" / "||") _ c:Conjunction { return c; })* {
      return naryNode("or", first, rest);
    }

Conjunction
  = first:Unary rest:(_ ("∧" / "&&") _ u:Unary { return u; })* {
      return naryNode("and", first, rest);
    }

Unary
  = ("¬" / "!") _ operand:Unary { return notNode(operand); }
  / Atom

Atom
  = "(" _ expr:Implication _ ")" { return expr; }
  / name:Identifier { return variableNode(name); }

Identifier
  = $([A-Za-z_][A-Za-z0-9_]*)

_ "whitespace"
  = [ \t\n\r]*
