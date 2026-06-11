from PIL import Image

def remove_white_bg(input_path, output_path, tolerance=80):
    try:
        img = Image.open(input_path).convert("RGBA")
        width, height = img.size
        pixels = img.load()
        
        # Determine background color by looking at the top-left pixel
        # The user's image is a typical square with white borders
        bg_color = pixels[0, 0]
        
        # Helper to compute color difference
        def color_diff(c1, c2):
            return sum(abs(a - b) for a, b in zip(c1[:3], c2[:3]))
            
        stack = [(0, 0), (width-1, 0), (0, height-1), (width-1, height-1), (width//2, 0), (width//2, height-1), (0, height//2), (width-1, height//2)]
        visited = set()
        
        while stack:
            x, y = stack.pop()
            if (x, y) in visited:
                continue
            visited.add((x, y))
            
            # If the pixel is close enough to white
            if color_diff(pixels[x, y], bg_color) <= tolerance or color_diff(pixels[x,y], (255,255,255)) <= tolerance:
                pixels[x, y] = (255, 255, 255, 0) # Transparent
                
                # Check neighbors
                if x > 0: stack.append((x-1, y))
                if x < width - 1: stack.append((x+1, y))
                if y > 0: stack.append((x, y-1))
                if y < height - 1: stack.append((x, y+1))
                
        img.save(output_path, "PNG")
        print(f"Saved transparent image to {output_path}")
    except Exception as e:
        print(f"Error: {e}")

remove_white_bg("C:\\Users\\Rajashekhar\\Downloads\\kad multiplier.png", "public/kad-multiplier-transparent.png")
