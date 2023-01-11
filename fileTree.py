SEPARATOR = "  "

class Directory:
    def __init__(self, name):
        self.children = {}
        self.val = None
        self.name = name
    
    def update_val(self):
        self.val = sum((self.children[c].get_val() for c in self.children))

    def get_val(self):
        if self.val == None:
            self.update_val()
        return self.val
    
    def add_child(self, c):
        self.children[c.name] = c

    def tree_print(self, level):
        print(SEPARATOR*level + self.name, self.val)
        for c in self.children:
            self.children[c].tree_print(level+1)

    def get_json(self, level):
        return "\n".join([SEPARATOR*level + "{" + f"\"name\": \"{self.name}\", \"val\": {self.val}, \"children\": [",
        ",\n".join([self.children[c].get_json(level+2) for c in self.children]),
        SEPARATOR*(level+1) + "]",
        SEPARATOR*level + "}"])

class File:
    def __init__(self, name, val):
        self.name = name
        self.val = val

    def get_val(self):
        return self.val

    def tree_print(self, level):
        print(SEPARATOR*level + self.name, self.val)

    def get_json(self, level):
        return SEPARATOR*level + f"{{\"name\": \"{self.name}\", \"val\": {self.val}}}"
