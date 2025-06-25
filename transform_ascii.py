#!/usr/bin/env python3
import re
import os

def transform_ascii_file(input_filename='ref/ascii/art.txt'):
    # Extract base name and index from input filename
    base_path = os.path.dirname(input_filename)
    filename = os.path.basename(input_filename)
    
    # Extract the base name and index using regex
    match = re.match(r'([A-Za-z.]+)(\d+)\.txt', filename)
    if match:
        base_name = match.group(1)
        current_index = int(match.group(2))
        next_index = current_index + 1
        output_filename = f"{base_name}{next_index}.txt"
    else:
        # Fallback if pattern doesn't match
        name_without_ext = os.path.splitext(filename)[0]
        output_filename = f"{name_without_ext}2.txt"
    
    # Create full output path in the same directory as input
    output_path = os.path.join(base_path, output_filename)
    
    # Read the original file
    with open(input_filename, 'r') as f:
        lines = f.readlines()
    
    # Pattern characters
    pattern_chars = ['.', '·']
    
    transformed_lines = []
    for line_num, line in enumerate(lines):
        line = line.rstrip('\n')
        if len(line) < 59:
            line = line.ljust(59)
        
        new_line = ""
        pattern_index = line_num % 2  # Start with '.' or '·' based on line number
        
        for char in line:
            if char in [' ', '.', '·']:
                # Replace space, dot, or middle dot with pattern character
                new_line += pattern_chars[pattern_index % 2]
            else:
                # Keep original character (/, |)
                new_line += char
            pattern_index += 1
        
        # Ensure line is exactly 59 characters
        if len(new_line) < 59:
            new_line = new_line.ljust(59, pattern_chars[pattern_index % 2])
        elif len(new_line) > 59:
            new_line = new_line[:59]
        
        transformed_lines.append(new_line)
    
    # Write to the new file with incremented index in the same directory
    with open(output_path, 'w') as f:
        for line in transformed_lines:
            f.write(line + '\n')
    
    return output_path

if __name__ == "__main__":
    output_file = transform_ascii_file()
    print(f"Transformation complete! Output saved to '{output_file}'") 