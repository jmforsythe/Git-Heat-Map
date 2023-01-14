function loadFile(filePath) {
    var result = null;
    var xmlhttp = new XMLHttpRequest();
    xmlhttp.open("GET", filePath, false);
    xmlhttp.send();
    if (xmlhttp.status==200) {
        result = xmlhttp.responseText;
    }
    return result;
}

function sort_by_val(j) {
    if ("children" in j) {
        j.children.forEach(sort_by_val)
        j.children.sort((a,b) => b.val-a.val)
    }
}

function worst(R, w) {
    const s = R.reduce((acc,x) => acc+x, 0)
    if (s == 0 || w == 0) return -Infinity
    let m = 0
    const ws2 = (w**2)/(s**2)
    for (let i=0; i<R.length; i++) {
        const r = R[i]
        m = Math.max(m, r*ws2, 1/(ws2*r))
    }
    return m
}

NEST = true
function handle_row(row, x, y, width, height, parent_path, level, SVG_ROOT) {
    if (width == 0 || height == 0) return
    let row_area = row.reduce((acc, cur) => acc+cur.val, 0)
    next_to_do = []
    row.forEach((val, index, array) => {
        let box_area = val.val
        if (width >= height) {
            const row_width = row_area / height
            const box_height = box_area / row_width
            if (row_width > 0 && box_height > 0) {
                if (NEST && "children" in val) squarify(x, y, row_width, box_height, val.children, `${parent_path}/${val.name}`, level+1, SVG_ROOT)
                SVG_ROOT.appendChild(get_box_text_element(
                    {"x": x, "y": y, "width": row_width, "height": box_height, "text": val.name, "parent": parent_path, "level": level, "leaf": !(NEST && "children" in val)}))
                y += box_height
            }
        } else {
            const row_height = row_area / width
            const box_width = box_area / row_height
            if (row_height > 0 && box_width > 0) {
                if (NEST && "children" in val) squarify(x, y, box_width, row_height, val.children, `${parent_path}/${val.name}`, level+1, SVG_ROOT)
                SVG_ROOT.appendChild(get_box_text_element(
                    {"x": x, "y": y, "width": box_width, "height": row_height, "text": val.name, "parent": parent_path, "level": level, "leaf": !(NEST && "children" in val)}))
                x += box_width
            }
        }
    })
}

function get_box_text_element(obj) {
    let element = document.createElementNS('http://www.w3.org/2000/svg', 'svg')
    let box = document.createElementNS('http://www.w3.org/2000/svg', 'rect')
    let text = document.createElementNS('http://www.w3.org/2000/svg', 'text')

    element.setAttribute("x", `${obj.x}`)
    element.setAttribute("y", `${obj.y}`)
    element.setAttribute("width", `${obj.width}`)
    element.setAttribute("height", `${obj.height}`)
    element.classList.add(`svg_level_${obj.level}`)
    if (obj.leaf) element.classList.add("svg_leaf")
    const path = `${obj.parent}/${obj.text}`
    element.setAttribute("id", `svg_path_${path}`)
    
    box.classList.add("svg_box")

    const txt = document.createTextNode(obj.text)
    text.appendChild(txt)
    text.classList.add("svg_text")
    text.setAttribute("x", "50%")
    text.setAttribute("y", "50%")
    text.setAttribute("dominant-baseline", "middle")
    text.setAttribute("text-anchor", "middle")
    let font_size = Math.min(1.5*obj.width/obj.text.length, 1.7*obj.height)
    text.setAttribute("font-size", `${font_size}`)
    text.setAttribute("stroke-width", `${font_size/100}`)

    element.appendChild(box)
    element.appendChild(text)
    return element
}

function squarify(x, y, width, height, children_in, parent_path, level, SVG_ROOT) {
    const children = children_in
    width = Math.max(0,width)
    height = Math.max(0,height)
    if (children.length == 0) {
        return
    }
    let size = width >= height ? height : width
    let row = [children[0]]
    let i = 1;
    for (i=1; i<children.length; i++) {
        let cur_worst = worst(row.map((c) => c.val), size)
        let pos_worst = worst((row.concat(children[i])).map((c) => c.val), size)
        if (cur_worst >= pos_worst) row.push(children[i])
        else break
    }
    handle_row(row, x, y, width, height, parent_path, level, SVG_ROOT)

    let area = row.reduce((acc, c) => acc+c.val, 0)
    let size_used = area / size
    if (width >= height) {
        x = x + size_used
        width = width - size_used
    } else {
        y = y + size_used
        height = height - size_used
    }
    row.push(squarify(x, y, width, height, children.slice(i), parent_path, level, SVG_ROOT))
    return row
}

function fraction_to_saturation_and_lightness(fraction) {
    let percentage = fraction*100
    sat_x1 = 0.3
    sat_x0 = 70
    light_x1 = -0.3
    light_x0 = 80
    return [sat_x1*percentage+sat_x0, light_x1*percentage+light_x0]
}

function highlight_node(path, hue, fraction) {
    let svg = document.getElementById(`svg_path_${path}`)
    if (!svg) return 
    let rect = svg.querySelector(".svg_box")
    if (!rect) return
    [saturation, lightness] = fraction_to_saturation_and_lightness(fraction)
    svg.querySelector(".svg_box").style["fill"] = `hsl(${hue},${saturation}%,${lightness}%)`
}

function highlight_obj_child(obj, hue, path, highest) {
    obj.children.forEach((val, index, array) => {
        if ("children" in val) {
            highlight_obj_child(val, hue, `${path}/${val.name}`, highest)
        } else {
            highlight_node(`${path}/${val.name}`, hue, val.val/highest)
        }
    })
}

function get_highest_leaf_in_obj(obj) {
    if ("children" in obj) {
        return Math.max(...obj.children.map((val) => get_highest_leaf_in_obj(val)))
    } else {
        return obj.val
    }
}

function highlight_obj(obj, hue) {
    const highest = get_highest_leaf_in_obj(obj)
    highlight_obj_child(obj, hue, "", highest)
}

function delete_children(node) {
    while (node.firstChild) {
        node.removeChild(node.lastChild)
    }
}

function get_child_from_path(obj, path) {
    if (path == "") return obj
    const index = path.indexOf("/")
    if (index == -1) {
        desired_child = obj.children.filter((child) => child.name == path)
        console.log(desired_child)
        if (desired_child.length == 1) {
            return desired_child[0]
        }
    } else {
        desired_child = obj.children.filter((child) => child.name == path.slice(0,index))
        if (desired_child.length == 1) {
            return get_child_from_path(desired_child[0], path.slice(index+1))
        }
    }
}

function display_filetree(filetree_obj, highlighting_obj, SVG_ROOT, x, y, aspect_ratio) {
    delete_children(SVG_ROOT)

    const area = filetree_obj.val
    const width = Math.sqrt(area*aspect_ratio)
    const height = area / width

    SVG_ROOT.setAttribute("viewBox", `0 0 ${width} ${height}`)
    squarify(x,y,width,height,filetree_obj.children,"",0, SVG_ROOT)
    highlight_obj(highlighting_obj, 0)
}

function display_filetree_path(filetree_obj, highlighting_obj, SVG_ROOT, x, y, aspect_ratio, path) {
    display_filetree(get_child_from_path(filetree_obj, path), get_child_from_path(highlighting_obj, path), SVG_ROOT, x, y, aspect_ratio)
}

function main() {
    const filetree_obj = JSON.parse(loadFile("filetree.json"))
    const highlighting_obj = JSON.parse(loadFile("highlight.json"))
    sort_by_val(filetree_obj)

    let SVG_ROOT = document.getElementById("jk")
    const vw = Math.max(SVG_ROOT.clientWidth || 0, SVG_ROOT.innerWidth || 0)
    const vh = Math.max(SVG_ROOT.clientHeight || 0, SVG_ROOT.innerHeight || 0)
    const aspect_ratio = vw/vh

    const x = 0
    const y = 0

    path_to_display = ""

    display_filetree_path(filetree_obj, highlighting_obj, SVG_ROOT, x, y, aspect_ratio, path_to_display)
}

main()
