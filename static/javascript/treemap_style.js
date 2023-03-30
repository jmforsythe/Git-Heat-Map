const SVG_STYLE = `
.svg_background {
    width: 100%;
    height: 100%;
    fill: #ffffff;
}

.svg_box {
    fill: "url(#Gradient2)";
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
