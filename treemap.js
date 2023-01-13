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

const my_json = JSON.parse(loadFile("tmp.json"))

function sort_by_val(j) {
    if ("children" in j) {
        j.children.forEach(sort_by_val)
        j.children.sort((a,b) => b.val-a.val)
    }
}

sort_by_val(my_json)

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
    element.setAttribute("id", `svg_path_${obj.parent}/${obj.text}`)
    
    box.classList.add("svg_box")

    const txt = document.createTextNode(obj.text)
    text.appendChild(txt)
    text.classList.add("svg_text")
    text.setAttribute("x", "50%")
    text.setAttribute("y", "50%")
    text.setAttribute("dominant-baseline", "middle")
    text.setAttribute("text-anchor", "middle")
    text.setAttribute("font-size", `${obj.width/8}`)

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

function fraction_of_changes_to_percentage_for_colour(fraction) {
    
}

function highlight_node(path, hue, percentage) {
    let svg = document.getElementById(`svg_path_${path}`)
    if (!svg) return 
    let rect = svg.querySelector(".svg_box")
    if (!rect) return
    svg.querySelector(".svg_box").style["fill"] = `hsl(${hue},${percentage}%,${50+(100-percentage)/2}%)`
}

function highlight_obj_child(obj, hue, path, total) {
    obj.children.forEach((val, index, array) => {
        if ("children" in val) {
            highlight_obj_child(val, hue, `${path}/${val.name}`, total)
        } else {
            highlight_node(`${path}/${val.name}`, hue, 30+70*val.val/total)
        }
    })
}

function highlight_obj(obj, hue) {
    const total = obj.val
    highlight_obj_child(obj, hue, "", total)
}

let thing = document.getElementById("jk")

const vw = Math.max(thing.clientWidth || 0, thing.innerWidth || 0)
const vh = Math.max(thing.clientHeight || 0, thing.innerHeight || 0)
const aspect_ratio = vw/vh
const area = my_json.val

const my_width = Math.sqrt(area*aspect_ratio)
const my_height = my_json.val / my_width
const x = 0
const y = 0

thing.setAttribute("viewBox", `0 0 ${my_width} ${my_height}`)
squarify(x,y,my_width,my_height,my_json.children,"",0, thing)
//thing.appendChild(get_box_text_element({"x": x, "y": y, "width": my_width, "height": my_height, "text": my_json.name, "parent": "", "level": 0, "leaf": false}))
