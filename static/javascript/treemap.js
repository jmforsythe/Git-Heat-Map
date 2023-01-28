function loadFile(filePath, paramsObj) {
    let result = null
    let xmlhttp = new XMLHttpRequest()
    const searchParams = new URLSearchParams()
    for (const key in paramsObj) {
        paramsObj[key].forEach((value) => searchParams.append(key, value))
    }
    if (searchParams.toString() != "") filePath += `?${searchParams.toString()}`
    xmlhttp.open("GET", filePath, false)
    xmlhttp.send()
    if (xmlhttp.status==200) {
        result = xmlhttp.responseText
    }
    return result
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
MIN_AREA = 0
function handle_row(row, x, y, width, height, parent_path, level, SVG_ROOT) {
    if (width == 0 || height == 0) return
    let row_area = row.reduce((acc, cur) => acc+cur.val, 0)
    next_to_do = []
    row.forEach((val, index, array) => {
        let box_area = val.val
        if (box_area < MIN_AREA) return
        if (width >= height) {
            const row_width = row_area / height
            const box_height = box_area / row_width
            if (row_width > 0 && box_height > 0) {
                if (NEST && "children" in val) squarify(x, y, row_width, box_height, val.children, `${parent_path}/${val.name}`, level+1, SVG_ROOT)
                SVG_ROOT.appendChild(get_box_text_element(
                    {"area": box_area, "x": x, "y": y, "width": row_width, "height": box_height, "text": val.name,
                     "parent": parent_path, "level": level, "leaf": !(NEST && "children" in val)}))
                y += box_height
            }
        } else {
            const row_height = row_area / width
            const box_width = box_area / row_height
            if (row_height > 0 && box_width > 0) {
                if (NEST && "children" in val) squarify(x, y, box_width, row_height, val.children, `${parent_path}/${val.name}`, level+1, SVG_ROOT)
                SVG_ROOT.appendChild(get_box_text_element(
                    {"area": box_area, "x": x, "y": y, "width": box_width, "height": row_height, "text": val.name,
                     "parent": parent_path, "level": level, "leaf": !(NEST && "children" in val)}))
                x += box_width
            }
        }
    })
}

function get_box_text_element(obj) {
    let element = document.createElementNS('http://www.w3.org/2000/svg', 'svg')
    let box = document.createElementNS('http://www.w3.org/2000/svg', 'rect')
    let text = document.createElementNS('http://www.w3.org/2000/svg', 'text')
    let title = document.createElementNS('http://www.w3.org/2000/svg', 'title')

    element.setAttribute("x", `${obj.x}`)
    element.setAttribute("y", `${obj.y}`)
    element.setAttribute("width", `${obj.width}`)
    element.setAttribute("height", `${obj.height}`)
    element.classList.add(`svg_level_${obj.level}`)
    if (obj.leaf) element.classList.add("svg_leaf")
    const path = `${obj.parent}/${obj.text}`
    element.setAttribute("id", `svg_path_${path}`)

    box.classList.add("svg_box")
    box.setAttribute("fill", "url(#Gradient2)")
    box.setAttribute("fill-opacity", "20%")

    const txt = document.createTextNode(obj.text)
    text.appendChild(txt)
    text.classList.add("svg_text")
    text.setAttribute("x", "50%")
    text.setAttribute("y", "50%")
    text.setAttribute("dominant-baseline", "middle")
    text.setAttribute("text-anchor", "middle")
    let font_size = Math.min(1.5*obj.width/obj.text.length, 1*obj.height)
    text.setAttribute("font-size", `${font_size}`)
    text.setAttribute("stroke-width", `${font_size/80}`)

    const title_txt = document.createTextNode(`${obj.area}\n${path}`)
    title.appendChild(title_txt)

    if (obj.level == 0) {
        if (!obj.leaf) element.onclick = () => {
            back_stack.push(obj.parent)
            display_filetree_path(filetree_obj_global, highlighting_obj_global, path)
        }
        element.onmouseover = () => box.classList.add("svg_box_selected")
        element.onmouseout = () => box.classList.remove("svg_box_selected")
    }

    element.appendChild(box)
    element.appendChild(text)
    element.appendChild(title)
    return element
}

function squarify(x, y, width, height, children_in, parent_path, level, SVG_ROOT) {
    const children = children_in
    width = Math.max(0,width)
    height = Math.max(0,height)
    if (!children || children.length == 0) {
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
    sat_x1 = 0.5
    sat_x0 = 40
    light_x1 = -0.5
    light_x0 = 100
    return [sat_x1*percentage+sat_x0, light_x1*percentage+light_x0]
}

function highlight_node(path, hue, this_val, max_val) {
    if (this_val == 0 || max_val <= 1) return
    fraction = Math.log(this_val) / Math.log(max_val)
    let svg = document.getElementById(`svg_path_${path}`)
    if (!svg) return 

    let rect = svg.querySelector(".svg_box")
    if (rect) {
        [saturation, lightness] = fraction_to_saturation_and_lightness(fraction)
        rect.style["fill"] = `hsl(${hue},${saturation}%,${lightness}%)`
        rect.style["fill-opacity"] = "100%"
    }
}

function highlight_obj_child(obj, hue, path, highest) {
    if ("children" in obj) {
        obj.children.forEach((child) => {
            highlight_obj_child(child, hue, `${path}/${child.name}`, highest)
        })
    } else {
        highlight_node(`${path}`, hue, obj.val, highest)
    }

    let svg = document.getElementById(`svg_path_${path}`)
    if (svg) {
        let alt_text = svg.querySelector("title")
        if (alt_text) {
            alt_text.textContent = alt_text.textContent.concat(`\n${obj.val}`)
        }
    }
}

function get_highest_leaf_in_obj(obj) {
    if ("children" in obj) {
        return Math.max(...obj.children.map((val) => get_highest_leaf_in_obj(val)))
    } else {
        return obj.val
    }
}

function highlight_obj(obj, hue, path) {
    if (!obj) return
    const highest = get_highest_leaf_in_obj(obj)
    highlight_obj_child(obj, hue, path, highest)
}

function delete_children(node) {
    let defs = []
    while (node.firstChild) {
        if (node.lastChild.nodeName == "defs") {
            defs.push(node.lastChild)
        }
        node.removeChild(node.lastChild)
    }
    defs.forEach((def) => node.appendChild(def))
}

function get_child_from_path(obj, path) {
    if (path[0] == "/") path = path.slice(1)
    if (path == "") return obj
    const index = path.indexOf("/")
    if (index == -1) {
        desired_child = obj.children.filter((child) => child.name == path)
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

function display_filetree(filetree_obj, highlighting_obj, SVG_ROOT, x, y, aspect_ratio, cur_path) {
    delete_children(SVG_ROOT)
    const area = filetree_obj.val
    const width = Math.sqrt(area*aspect_ratio)
    const height = area / width

    MIN_AREA = area / 5000

    SVG_ROOT.setAttribute("viewBox", `0 0 ${width} ${height}`)
    if ("children" in filetree_obj) {
        squarify(x,y,width,height,filetree_obj.children, cur_path, 0, SVG_ROOT)
    } else {
        handle_row([filetree_obj], x, y, width, height, cur_path, 0, SVG_ROOT)
    }
    highlight_obj(highlighting_obj, 0, cur_path)
}

function display_filetree_path(filetree_obj, highlighting_obj, path) {
    const [SVG_ROOT, x, y, aspect_ratio] = get_drawing_params()
    display_filetree(get_child_from_path(filetree_obj, path), get_child_from_path(highlighting_obj, path), SVG_ROOT, x, y, aspect_ratio, path)
}

function get_drawing_params() {
    const SVG_ROOT = document.getElementById("treemap_root_svg")
    const vw = Math.max(SVG_ROOT.clientWidth || 0, SVG_ROOT.innerWidth || 0)
    const vh = Math.max(SVG_ROOT.clientHeight || 0, SVG_ROOT.innerHeight || 0)
    const aspect_ratio = vw/vh
    const x = 0
    const y = 0
    return [SVG_ROOT, x, y, aspect_ratio]
}

function back_button_setup() {
    let back_button = document.getElementById("back-button")
    if (back_button) {
        back_button.onclick = () => {
            path = back_stack.pop()
            if (path == null) path = ""
            display_filetree_path(filetree_obj_global, highlighting_obj_global, path)
        }
    }
}

function email_entry_setup() {
    let email_entry = document.getElementById("email-entry")
    let email_submit = document.getElementById("email-submit")
    if (email_entry && email_submit) {
        const func = () => {
            console.log(`Starting ${email_entry.value}`)
            const start_time = performance.now()
            display_filetree_with_params({}, {"emails": [email_entry.value]})
            const end_time = performance.now()
            console.log(end_time-start_time)
            return false
        }
        email_submit.onclick = func
        email_submit.onsubmit = func
    }
}

function display_filetree_with_params(filetree_params, highlight_params) {
    highlighting_obj_global = JSON.parse(loadFile(`highlight/${DATABASE_NAME}.json`, highlight_params))
    back_stack = []
    display_filetree_path(filetree_obj_global, highlighting_obj_global, "")
}

function main() {
    display_filetree_with_params({}, {})
    back_button_setup()
    email_entry_setup()
}

let filetree_obj_global = JSON.parse(loadFile(`filetree/${DATABASE_NAME}.json`))
sort_by_val(filetree_obj_global)
let highlighting_obj_global
let back_stack = []

main()
