#!/usr/bin/env python3

def compare_ascii_files(file1_path, file2_path, output_path):
    """
    Compare two ASCII files and create a new file based on the mapping rules.
    """
    # Read both files
    with open(file1_path, 'r', encoding='utf-8') as f1:
        lines1 = f1.readlines()
    
    with open(file2_path, 'r', encoding='utf-8') as f2:
        lines2 = f2.readlines()
    
    # Ensure both files have the same number of lines
    if len(lines1) != len(lines2):
        raise ValueError(f"Files have different number of lines: {len(lines1)} vs {len(lines2)}")
    
    result_lines = []
    
    for i, (line1, line2) in enumerate(zip(lines1, lines2)):
        # Remove trailing newline and ensure same length
        line1 = line1.rstrip('\n')
        line2 = line2.rstrip('\n')
        
        # Pad shorter line with spaces to match the longer one
        max_len = max(len(line1), len(line2))
        line1 = line1.ljust(max_len)
        line2 = line2.ljust(max_len)
        
        result_line = ""
        for j, (char1, char2) in enumerate(zip(line1, line2)):
            # Apply mapping rules
            if char1 == ' ' and char2 == ' ':
                result_line += ' '
            elif char1 == '0' and char2 == '0':
                result_line += 'i'
            elif char1 == '1' and char2 == '1':
                result_line += 'l'
            elif char2 == '0' and char1 == '1':  # grad8 has 0, Show4 has 1
                result_line += 'j'
            elif char2 == '0' and char1 == ' ':  # grad8 has 0, Show4 has space
                result_line += 'k'
            elif char2 == '1' and char1 == '0':  # grad8 has 1, Show4 has 0
                result_line += 'm'
            elif char2 == '1' and char1 == ' ':  # grad8 has 1, Show4 has space
                result_line += 'n'
            elif char2 == ' ' and char1 == '0':  # grad8 has space, Show4 has 0
                result_line += 'p'
            elif char2 == ' ' and char1 == '1':  # grad8 has space, Show4 has 1
                result_line += 'q'
            else:
                # For any other combination, keep space
                result_line += ' '
        
        result_lines.append(result_line + '\n')
    
    # Write the result
    with open(output_path, 'w', encoding='utf-8') as f:
        f.writelines(result_lines)

if __name__ == "__main__":
    # Create grad-show.txt (original order: grad8 vs Show4)
    compare_ascii_files('assets/ascii/grad8.txt', 'assets/ascii/Show4.txt', 'assets/ascii/grad-show.txt')
    print("grad-show.txt created successfully!")
    
    # Create grad-show2.txt (reversed order: Show4 vs grad8)
    compare_ascii_files('assets/ascii/Show4.txt', 'assets/ascii/grad8.txt', 'assets/ascii/grad-show2.txt')
    print("grad-show2.txt created successfully!") 