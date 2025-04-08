#!/bin/bash

# Temporary folder to clone repositories
TEMP_DIR="temp_repos"
mkdir -p "$TEMP_DIR"

OUTPUT_FILE="resources/libs.json"
echo "{" > "$OUTPUT_FILE"

REPOS_FILE="resources/repos.json"
echo "[" > "$REPOS_FILE"

MATCHED_LIBRARIES=()

# Check if at least one argument (organization name) is provided
if [ "$#" -lt 1 ]; then
  echo "Error: You must specify the organization name as the first argument."
  exit 1
fi

# First argument: Azure DevOps organization
ORG="$1"
shift

# Check if project name is provided
if [ "$#" -lt 1 ]; then
  echo "Error: You must specify the project name as the second argument."
  exit 1
fi

# Second argument: Azure DevOps project
PROJECT="$1"
shift

# Remaining arguments: libraries to filter (optional)
LIBRARIES=("$@")

if [ "${#LIBRARIES[@]}" -gt 0 ]; then
  echo "Filtering by libraries: ${LIBRARIES[*]}"
else
  echo "Searching in all repositories without filtering libraries."
fi

echo "Retrieving repositories from organization '$ORG', project '$PROJECT'..."

# Read repositories into array safely
readarray -t REPOS < <(az repos list --organization "https://dev.azure.com/$ORG" --project "$PROJECT" --query "[].name" -o tsv)

if [ "${#REPOS[@]}" -eq 0 ]; then
    echo "❌ No repositories found"
    echo "{}" > "$OUTPUT_FILE"
    echo "[]" > "$REPOS_FILE"
    exit 1
fi

echo "Repositories found:"
printf '%s\n' "${REPOS[@]}"

FIRST_REPO=true
FIRST_ALL=true

# Process every repository
for REPO in "${REPOS[@]}"; do
    CLEAN_REPO_NAME=$(echo "$REPO" | tr -d '\n\r')
    SAFE_REPO_NAME=$(echo "$CLEAN_REPO_NAME" | tr -cd '[:alnum:]-_')

    # Append to all_repos.json
    if [ "$FIRST_ALL" = false ]; then
        echo "," >> "$REPOS_FILE"
    fi
    echo "  \"$CLEAN_REPO_NAME\"" >> "$REPOS_FILE"
    FIRST_ALL=false

    echo "📦 Cloning: $CLEAN_REPO_NAME → $SAFE_REPO_NAME"
    git clone --depth 1 "https://dev.azure.com/$ORG/$PROJECT/_git/$CLEAN_REPO_NAME" "$TEMP_DIR/$SAFE_REPO_NAME"

    if [ $? -ne 0 ]; then
        echo "❌ Error cloning $CLEAN_REPO_NAME. Skipping repository..."
        continue
    fi

    if [ -f "$TEMP_DIR/$SAFE_REPO_NAME/package.json" ]; then
        PACKAGE_JSON=$(cat "$TEMP_DIR/$SAFE_REPO_NAME/package.json")

        LIBRARIES_FOUND=""
        for LIB in "${LIBRARIES[@]}"; do
            VERSION=$(echo "$PACKAGE_JSON" | jq -r ".dependencies[\"$LIB\"] // .devDependencies[\"$LIB\"] // empty")
            if [[ ! -z "$VERSION" && "$VERSION" != "null" ]]; then
                LIBRARIES_FOUND+=", \"$LIB\": \"$VERSION\""
            fi
        done

        if [[ ! -z "$LIBRARIES_FOUND" ]]; then
            LIBRARIES_FOUND=${LIBRARIES_FOUND:2}
            if [ "$FIRST_REPO" = false ]; then
                echo "," >> "$OUTPUT_FILE"
            fi
            echo "  \"$CLEAN_REPO_NAME\": { $LIBRARIES_FOUND }" >> "$OUTPUT_FILE"
            FIRST_REPO=false
        fi
    fi

    rm -rf "$TEMP_DIR/$SAFE_REPO_NAME"
done

echo "" >> "$OUTPUT_FILE"
echo "}" >> "$OUTPUT_FILE"
echo "]" >> "$REPOS_FILE"
rm -rf "$TEMP_DIR"

echo "✅ Search completed. Results saved to: $OUTPUT_FILE and $REPOS_FILE"
