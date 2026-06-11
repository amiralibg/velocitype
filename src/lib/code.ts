import type { Difficulty } from './types';

export type Language = 'javascript' | 'python' | 'go' | 'css';

export const LANGUAGES: { id: Language; name: string; ext: string }[] = [
  { id: 'javascript', name: 'JavaScript', ext: '.js' },
  { id: 'python', name: 'Python', ext: '.py' },
  { id: 'go', name: 'Go', ext: '.go' },
  { id: 'css', name: 'CSS', ext: '.css' },
];

const SNIPPETS: Record<Language, Record<Difficulty, string[]>> = {
  javascript: {
    easy: [
      `const nums = [1, 2, 3];\nconst total = nums.reduce((a, b) => a + b, 0);`,
      `const name = "velocity";\nconsole.log(name.toUpperCase());`,
      `const double = (n) => n * 2;\nconst result = double(21);`,
    ],
    medium: [
      `function unique(arr) {\n  return [...new Set(arr)];\n}\nconst tags = unique(["a", "b", "a"]);`,
      `const res = await fetch(url);\nconst user = await res.json();\nconsole.log(user.name);`,
      `const evens = items\n  .filter((n) => n % 2 === 0)\n  .map((n) => n * n);`,
    ],
    hard: [
      `const debounce = (fn, ms) => {\n  let timer;\n  return (...args) => {\n    clearTimeout(timer);\n    timer = setTimeout(() => fn(...args), ms);\n  };\n};`,
      `class Queue {\n  items = [];\n  push(item) {\n    this.items.push(item);\n  }\n  pop() {\n    return this.items.shift();\n  }\n}`,
      `const groupBy = (arr, key) =>\n  arr.reduce((acc, item) => {\n    (acc[item[key]] ??= []).push(item);\n    return acc;\n  }, {});`,
    ],
  },
  python: {
    easy: [
      `nums = [1, 2, 3]\ntotal = sum(nums)\nprint(total)`,
      `name = "velocity"\nprint(name.upper())`,
      `squares = [n * n for n in range(10)]`,
    ],
    medium: [
      `def unique(items):\n    return list(set(items))\ntags = unique(["a", "b", "a"])`,
      `with open("data.txt") as f:\n    lines = f.read().splitlines()\nprint(len(lines))`,
      `def greet(name="world"):\n    return f"hello, {name}!"\nprint(greet("dev"))`,
    ],
    hard: [
      `def fib(n):\n    a, b = 0, 1\n    for _ in range(n):\n        a, b = b, a + b\n    return a`,
      `class Stack:\n    def __init__(self):\n        self.items = []\n    def push(self, item):\n        self.items.append(item)\n    def pop(self):\n        return self.items.pop()`,
      `def flatten(nested):\n    result = []\n    for item in nested:\n        if isinstance(item, list):\n            result.extend(flatten(item))\n        else:\n            result.append(item)\n    return result`,
    ],
  },
  go: {
    easy: [
      `x := 10\ny := x * 2\nfmt.Println(y)`,
      `name := "velocity"\nfmt.Println(strings.ToUpper(name))`,
      `nums := []int{1, 2, 3}\nfmt.Println(len(nums))`,
    ],
    medium: [
      `func sum(nums []int) int {\n    total := 0\n    for _, n := range nums {\n        total += n\n    }\n    return total\n}`,
      `if err != nil {\n    log.Fatalf("request failed: %v", err)\n}\ndefer resp.Body.Close()`,
      `type User struct {\n    Name string\n    Age  int\n}\nu := User{Name: "dev", Age: 30}`,
    ],
    hard: [
      `func mapKeys(m map[string]int) []string {\n    keys := make([]string, 0, len(m))\n    for k := range m {\n        keys = append(keys, k)\n    }\n    return keys\n}`,
      `ch := make(chan int)\ngo func() {\n    for i := 0; i < 5; i++ {\n        ch <- i\n    }\n    close(ch)\n}()`,
      `func worker(jobs <-chan int, results chan<- int) {\n    for j := range jobs {\n        results <- j * 2\n    }\n}`,
    ],
  },
  css: {
    easy: [
      `.btn {\n  color: white;\n  background: black;\n}`,
      `h1 {\n  font-size: 3rem;\n  letter-spacing: -0.04em;\n}`,
      `a:hover {\n  text-decoration: underline;\n}`,
    ],
    medium: [
      `.card {\n  display: flex;\n  gap: 1rem;\n  border-radius: 12px;\n  padding: 1.5rem;\n}`,
      `.grid {\n  display: grid;\n  grid-template-columns: repeat(3, 1fr);\n  gap: 2rem;\n}`,
      `:root {\n  --accent: #c8ff00;\n  --ink: #f2f2ed;\n}`,
    ],
    hard: [
      `@media (max-width: 768px) {\n  .grid {\n    grid-template-columns: 1fr;\n    gap: 0.5rem;\n  }\n}`,
      `@keyframes rise {\n  from {\n    opacity: 0;\n    transform: translateY(20px);\n  }\n  to {\n    opacity: 1;\n  }\n}`,
      `.overlay::after {\n  content: "";\n  position: absolute;\n  inset: 0;\n  background: rgba(0, 0, 0, 0.6);\n}`,
    ],
  },
};

export function randomSnippet(lang: Language, difficulty: Difficulty): string {
  const pool = SNIPPETS[lang][difficulty];
  return pool[Math.floor(Math.random() * pool.length)];
}
