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

const sort_by_val = (j) => {
    if ("children" in j) {
        j.children.forEach(sort_by_val)
        j.children.sort((a,b) => b.val-a.val)
    }
}

sort_by_val(my_json)

const worst = (R, w) => {
    if (R === []) return Infinity
    let s = R.reduce((acc,x) => acc+x, 0)
    let m = 0
    let ws2 = (w**2)/(s**2)
    for (let i=0; i<R.length; i++) {
        const r = R[i]
        m = Math.max(m, r*ws2, 1/(ws2*r))
    }
    return m
}

/*
worst = (R, w) => {
    let s = R.reduce((acc, x) => acc+x, 0)
    let h = s/w
    let m = 0
    for (let i=0; i<R.length; i++) {
        const r = R[i]
        this_w = r/h
        console.log(i, r, this_w)
        m = Math.max(m, this_w/h, h/this_w)
    }
    return m
}
*/

let OutCanvas = []

const handle_row = (row, x, y, width, height) => {
    let row_area = row.reduce((acc, cur) => acc+cur.val, 0)
    row.forEach((val, index, array) => {
        let box_area = val.val
        if (width >= height) {
            let row_width = row_area / height
            let box_height = box_area / row_width
            OutCanvas.push({"x": x, "y": y, "width": row_width, "height": box_height, "text": val.name})
            if ("children" in val) squarify(x, y, row_width, box_height, val.children)
            y += box_height
        } else {
            let row_height = row_area / width
            let box_width = box_area / row_height
            OutCanvas.push({"x": x, "y": y, "width": box_width, "height": row_height, "text": val.name})
            if ("children" in val) squarify(x, y, box_width, row_height, val.children)
            x += box_width
        }
    })
}

const obj_to_svg = (obj, scale) => {
    return `<rect fill='grey' x='${obj.x*scale}', y='${obj.y*scale}', width='${obj.width*scale}', height='${obj.height*scale}'/>'` +
    `<text x=${obj.x*scale + obj.width*scale/2} y=${obj.y*scale + obj.height*scale/2} fill='white' font-size=${obj.width*scale / 25}>${obj.text}</text>`
}

const squarify = (x, y, width, height, children) => {
    if (children.length == 0) {
        return
    }
    size = width >= height ? height : width
    let row = [children[0]]
    let i = 1;
    for (i=1; i<children.length; i++) {
        let cur_worst = worst(row.map((c) => c.val), size)
        let pos_worst = worst((row.concat(children[i])).map((c) => c.val), size)
        if (cur_worst >= pos_worst) row.push(children[i])
        else break
    }
    handle_row(row, x, y, width, height)
    let area = row.reduce((acc, c) => acc+c.val, 0)
    let size_used = area / size
    if (width >= height) {
        x = x + size_used
        width = width - size_used
    } else {
        y = y + size_used
        height = height - size_used
    }
    row.push(squarify(x, y, width, height, children.slice(i)))
    return row
}

function unitTest () {
    y = [{"val":6},{"val":6},{"val":4},{"val":3},{"val":2},{"val":2},{"val":1}]
    out = squarify(0,0,6,4,y)
    if (out[0].val != 6 || out[1].val != 6) return false
    out2 = out[2]
    if (out2[0].val != 4 || out2[1].val != 3) return false
    return (out2[2][0].val == 2 && out2[2][1][0].val == 2 && out2[2][1][1][0].val == 1)
}

console.log("Unit test", unitTest())

OutCanvas = []
const my_width = 4000
const my_height = my_json.val / my_width
squarify(0,0,my_width,my_height,my_json.children)

OutCanvas.forEach((val) => {
    let thing = document.getElementById("jk")
    thing.setAttribute("width", my_width)
    thing.setAttribute("height", my_height)
    document.getElementById("jk").innerHTML = document.getElementById("jk").innerHTML + obj_to_svg(val, 1)
})
