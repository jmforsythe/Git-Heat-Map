const SVG_STYLE = `
.svg_background {
    width: 100%;
    height: 100%;
    fill: #ffffff;
}

.svg_box {
    visibility: hidden;
    width: 100%;
    height: 100%;
}

.is_visible .svg_box {
    visibility: visible;
}

.svg_box_selected {
    stroke: blue;
    stroke-width: 2%;
}

.svg_leaf .svg_box_selected {
    stroke: lightblue;
}

.svg_submodule .svg_box_selected {
    stroke: orange;
}

.svg_text {
    visibility: hidden;
    font-family: monospace;
}

.svg_box_highlight {
    width: 100%;
    height: 100%;
}
`

function delete_styles(node) {
    cur_style_element = node.querySelector("style")
    if (cur_style_element) {
        node.removeChild(cur_style_element)
    }
}

function update_styles(node, text_depth) {
    delete_styles(node)
    const style = document.createElement("style")

    let text_rule = ""

    for (let i=0; i<text_depth; i++) {
        const first_chr = Math.floor(i / 2)
        const second_chr = i%2 ? 8 : 0
        const hex = `${first_chr}${second_chr}`
        text_rule +=
`
.svg_level_${i}.is_visible .svg_text {
    fill: #${hex}${hex}${hex};
    stroke: white;
    visibility: visible;
}
`
    }
    style.innerHTML = SVG_STYLE + text_rule
    node.insertBefore(style, node.firstChild)
}

function delete_defs(node) {
    cur_defs_element = node.querySelector("defs")
    if (cur_defs_element) {
        node.removeChild(cur_defs_element)
    }
}

function update_defs(node, gradient_depth=10) {
    delete_defs(node)
    const defs = document.createElementNS("http://www.w3.org/2000/svg", "defs")

    for (let i = 0; i < gradient_depth; i++) {
        const linearGradient = document.createElementNS("http://www.w3.org/2000/svg", "linearGradient")
        const gradient_attrs = {id:`Gradient${i}`, x1:"0%", x2:"100%", y1:"0%", y2:"100%"}
        for (const attr in gradient_attrs) {
            linearGradient.setAttribute(attr, gradient_attrs[attr])
        }
        const stop1_opacity = Math.min(1,0.3+0.2*i)
        const stop2_opacity = Math.max(0, 0.2)
        const stop1 = document.createElementNS("http://www.w3.org/2000/svg", "stop")
        stop1.setAttribute("offset", "0%")
        stop1.setAttribute("style", `stop-color: #333333; stop-opacity: ${stop1_opacity}`)
        const stop2 = document.createElementNS("http://www.w3.org/2000/svg", "stop")
        stop2.setAttribute("offset", "100%")
        stop2.setAttribute("style", `stop-color: #bbbbbb; stop-opacity: ${stop2_opacity}`)
        linearGradient.replaceChildren(stop1, stop2)
        defs.appendChild(linearGradient)
    }
    node.insertBefore(defs, node.firstChild)
}
