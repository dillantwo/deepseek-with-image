import React from 'react'
import Markdown from 'react-markdown'
import remarkMath from 'remark-math'
import rehypeKatex from 'rehype-katex'

const MathTest = () => {
  const testContent = `
# Math Test

Inline math: $x = \frac{-b \pm \sqrt{b^2 - 4ac}}{2a}$

Display math:
$$
x = \frac{-b \pm \sqrt{b^2 - 4ac}}{2a}
$$

Another test with backslash notation:
\\( a^2 + b^2 = c^2 \\)

Display with backslash notation:
\\[
A = \pi r^2
\\]
  `

  return (
    <div className="p-4">
      <h2>Math Rendering Test</h2>
      <Markdown 
        remarkPlugins={[remarkMath]}
        rehypePlugins={[rehypeKatex]}
      >
        {testContent}
      </Markdown>
    </div>
  )
}

export default MathTest
