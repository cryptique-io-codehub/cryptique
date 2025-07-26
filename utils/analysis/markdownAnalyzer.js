/**
 * Markdown Analysis Utilities
 * Analyzes markdown files for references, links, and usage patterns
 */

const fs = require('fs');
const path = require('path');
const { promisify } = require('util');

const readFile = promisify(fs.readFile);

class MarkdownAnalyzer {
  constructor() {
    this.linkPatterns = {
      // Markdown links: [text](url) or [text](./path/file.md)
      markdownLinks: /\[([^\]]*)\]\(([^)]+)\)/g,
      // Reference-style links: [text][ref] and [ref]: url
      referenceLinks: /\[([^\]]*)\]\[([^\]]*)\]/g,
      referenceDefs: /^\[([^\]]+)\]:\s*(.+)$/gm,
      // HTML links: <a href="url">text</a>
      htmlLinks: /<a\s+[^>]*href\s*=\s*["']([^"']+)["'][^>]*>/gi,
      // Image references: ![alt](src)
      images: /!\[([^\]]*)\]\(([^)]+)\)/g,
      // File references in code blocks or inline code
      fileReferences: /`([^`]*\.(js|jsx|ts|tsx|json|md|py|sh|yml|yaml))`/g,
      // Include/import patterns specific to documentation
      includes: /#include\s+["']([^"']+)["']/g
    };
  }

  /**
   * Analyze a single markdown file for references and links
   * @param {string} filePath - Path to the markdown file
   * @returns {Promise<Object>} Analysis results
   */
  async analyzeMarkdownFile(filePath) {
    try {
      const content = await readFile(filePath, 'utf8');
      const stats = await fs.promises.stat(filePath);
      
      const analysis = {
        path: filePath,
        name: path.basename(filePath),
        size: stats.size,
        lastModified: stats.mtime,
        isEmpty: content.trim().length === 0,
        lineCount: content.split('\n').length,
        wordCount: content.split(/\s+/).filter(word => word.length > 0).length,
        links: this.extractLinks(content, filePath),
        references: this.extractFileReferences(content, filePath),
        sections: this.extractSections(content),
        metadata: this.extractMetadata(content)
      };

      return analysis;
    } catch (error) {
      return {
        path: filePath,
        error: error.message,
        isEmpty: true,
        links: [],
        references: [],
        sections: [],
        metadata: {}
      };
    }
  }

  /**
   * Extract all types of links from markdown content
   * @param {string} content - Markdown content
   * @param {string} filePath - Path to the file being analyzed
   * @returns {Array} Array of link objects
   */
  extractLinks(content, filePath) {
    const links = [];
    const baseDir = path.dirname(filePath);

    // Extract markdown links
    let match;
    while ((match = this.linkPatterns.markdownLinks.exec(content)) !== null) {
      const [fullMatch, text, url] = match;
      links.push({
        type: 'markdown',
        text: text.trim(),
        url: url.trim(),
        isLocal: this.isLocalFile(url),
        resolvedPath: this.isLocalFile(url) ? path.resolve(baseDir, url) : null,
        line: this.getLineNumber(content, match.index)
      });
    }

    // Reset regex lastIndex
    this.linkPatterns.markdownLinks.lastIndex = 0;

    // Extract reference-style links
    const referenceDefs = new Map();
    while ((match = this.linkPatterns.referenceDefs.exec(content)) !== null) {
      const [, ref, url] = match;
      referenceDefs.set(ref.toLowerCase(), url.trim());
    }

    this.linkPatterns.referenceDefs.lastIndex = 0;

    while ((match = this.linkPatterns.referenceLinks.exec(content)) !== null) {
      const [fullMatch, text, ref] = match;
      const url = referenceDefs.get(ref.toLowerCase()) || ref;
      links.push({
        type: 'reference',
        text: text.trim(),
        url: url,
        reference: ref,
        isLocal: this.isLocalFile(url),
        resolvedPath: this.isLocalFile(url) ? path.resolve(baseDir, url) : null,
        line: this.getLineNumber(content, match.index)
      });
    }

    this.linkPatterns.referenceLinks.lastIndex = 0;

    // Extract HTML links
    while ((match = this.linkPatterns.htmlLinks.exec(content)) !== null) {
      const [fullMatch, url] = match;
      links.push({
        type: 'html',
        text: '',
        url: url.trim(),
        isLocal: this.isLocalFile(url),
        resolvedPath: this.isLocalFile(url) ? path.resolve(baseDir, url) : null,
        line: this.getLineNumber(content, match.index)
      });
    }

    this.linkPatterns.htmlLinks.lastIndex = 0;

    // Extract image references
    while ((match = this.linkPatterns.images.exec(content)) !== null) {
      const [fullMatch, alt, src] = match;
      links.push({
        type: 'image',
        text: alt.trim(),
        url: src.trim(),
        isLocal: this.isLocalFile(src),
        resolvedPath: this.isLocalFile(src) ? path.resolve(baseDir, src) : null,
        line: this.getLineNumber(content, match.index)
      });
    }

    this.linkPatterns.images.lastIndex = 0;

    return links;
  }

  /**
   * Extract file references from markdown content
   * @param {string} content - Markdown content
   * @param {string} filePath - Path to the file being analyzed
   * @returns {Array} Array of file reference objects
   */
  extractFileReferences(content, filePath) {
    const references = [];
    const baseDir = path.dirname(filePath);

    // Extract file references in code blocks
    let match;
    while ((match = this.linkPatterns.fileReferences.exec(content)) !== null) {
      const [fullMatch, fileName] = match;
      references.push({
        type: 'code',
        fileName: fileName.trim(),
        resolvedPath: path.resolve(baseDir, fileName),
        line: this.getLineNumber(content, match.index)
      });
    }

    this.linkPatterns.fileReferences.lastIndex = 0;

    // Extract include patterns
    while ((match = this.linkPatterns.includes.exec(content)) !== null) {
      const [fullMatch, fileName] = match;
      references.push({
        type: 'include',
        fileName: fileName.trim(),
        resolvedPath: path.resolve(baseDir, fileName),
        line: this.getLineNumber(content, match.index)
      });
    }

    this.linkPatterns.includes.lastIndex = 0;

    return references;
  }

  /**
   * Extract section headers from markdown content
   * @param {string} content - Markdown content
   * @returns {Array} Array of section objects
   */
  extractSections(content) {
    const sections = [];
    const lines = content.split('\n');
    
    lines.forEach((line, index) => {
      const headerMatch = line.match(/^(#{1,6})\s+(.+)$/);
      if (headerMatch) {
        const [, hashes, title] = headerMatch;
        sections.push({
          level: hashes.length,
          title: title.trim(),
          line: index + 1,
          anchor: this.generateAnchor(title.trim())
        });
      }
    });

    return sections;
  }

  /**
   * Extract metadata from markdown frontmatter
   * @param {string} content - Markdown content
   * @returns {Object} Metadata object
   */
  extractMetadata(content) {
    const frontmatterMatch = content.match(/^---\n([\s\S]*?)\n---/);
    if (!frontmatterMatch) {
      return {};
    }

    const frontmatter = frontmatterMatch[1];
    const metadata = {};
    
    frontmatter.split('\n').forEach(line => {
      const colonIndex = line.indexOf(':');
      if (colonIndex > 0) {
        const key = line.substring(0, colonIndex).trim();
        const value = line.substring(colonIndex + 1).trim();
        metadata[key] = value.replace(/^["']|["']$/g, ''); // Remove quotes
      }
    });

    return metadata;
  }

  /**
   * Check if a URL/path is a local file
   * @param {string} url - URL or path to check
   * @returns {boolean} True if local file
   */
  isLocalFile(url) {
    return !url.startsWith('http://') && 
           !url.startsWith('https://') && 
           !url.startsWith('mailto:') &&
           !url.startsWith('#') &&
           !url.includes('://');
  }

  /**
   * Get line number for a character index in content
   * @param {string} content - Content string
   * @param {number} index - Character index
   * @returns {number} Line number
   */
  getLineNumber(content, index) {
    return content.substring(0, index).split('\n').length;
  }

  /**
   * Generate anchor from title text
   * @param {string} title - Section title
   * @returns {string} Anchor string
   */
  generateAnchor(title) {
    return title.toLowerCase()
      .replace(/[^\w\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '');
  }

  /**
   * Analyze multiple markdown files and find relationships
   * @param {Array} markdownFiles - Array of markdown file objects
   * @param {string} rootPath - Root path for analysis
   * @returns {Promise<Object>} Analysis results
   */
  async analyzeMarkdownFiles(markdownFiles, rootPath) {
    const analyses = [];
    const linkMap = new Map();
    const referenceMap = new Map();

    // Analyze each file
    for (const file of markdownFiles) {
      const analysis = await this.analyzeMarkdownFile(file.path);
      analyses.push(analysis);

      // Build link and reference maps
      analysis.links.forEach(link => {
        if (link.isLocal && link.resolvedPath) {
          if (!linkMap.has(link.resolvedPath)) {
            linkMap.set(link.resolvedPath, []);
          }
          linkMap.get(link.resolvedPath).push({
            fromFile: file.path,
            link: link
          });
        }
      });

      analysis.references.forEach(ref => {
        if (!referenceMap.has(ref.resolvedPath)) {
          referenceMap.set(ref.resolvedPath, []);
        }
        referenceMap.get(ref.resolvedPath).push({
          fromFile: file.path,
          reference: ref
        });
      });
    }

    // Find unused markdown files
    const unusedMarkdownFiles = this.findUnusedMarkdownFiles(analyses, linkMap, rootPath);

    // Find broken links
    const brokenLinks = await this.findBrokenLinks(analyses, rootPath);

    // Find outdated files
    const outdatedFiles = this.findOutdatedFiles(analyses);

    return {
      analyses,
      summary: {
        totalFiles: analyses.length,
        emptyFiles: analyses.filter(a => a.isEmpty).length,
        filesWithLinks: analyses.filter(a => a.links.length > 0).length,
        filesWithReferences: analyses.filter(a => a.references.length > 0).length,
        unusedFiles: unusedMarkdownFiles.length,
        brokenLinks: brokenLinks.length,
        outdatedFiles: outdatedFiles.length
      },
      relationships: {
        linkMap,
        referenceMap
      },
      issues: {
        unused: unusedMarkdownFiles,
        broken: brokenLinks,
        outdated: outdatedFiles
      },
      recommendations: this.generateMarkdownRecommendations(analyses, unusedMarkdownFiles, brokenLinks, outdatedFiles)
    };
  }

  /**
   * Find unused markdown files
   * @param {Array} analyses - File analyses
   * @param {Map} linkMap - Link relationship map
   * @param {string} rootPath - Root path
   * @returns {Array} Unused files
   */
  findUnusedMarkdownFiles(analyses, linkMap, rootPath) {
    const unused = [];
    
    analyses.forEach(analysis => {
      const isReferenced = linkMap.has(analysis.path);
      const isMainReadme = analysis.name.toLowerCase() === 'readme.md' && 
                          path.dirname(analysis.path) === rootPath;
      const hasContent = !analysis.isEmpty && analysis.wordCount > 10;
      
      if (!isReferenced && !isMainReadme && (!hasContent || analysis.wordCount < 50)) {
        unused.push({
          path: analysis.path,
          reason: !hasContent ? 'empty_or_minimal' : 'not_referenced',
          size: analysis.size,
          wordCount: analysis.wordCount,
          lastModified: analysis.lastModified
        });
      }
    });

    return unused;
  }

  /**
   * Find broken links in markdown files
   * @param {Array} analyses - File analyses
   * @param {string} rootPath - Root path
   * @returns {Promise<Array>} Broken links
   */
  async findBrokenLinks(analyses, rootPath) {
    const brokenLinks = [];

    for (const analysis of analyses) {
      for (const link of analysis.links) {
        if (link.isLocal && link.resolvedPath) {
          try {
            await fs.promises.access(link.resolvedPath);
          } catch (error) {
            brokenLinks.push({
              file: analysis.path,
              link: link,
              error: 'File not found'
            });
          }
        }
      }

      for (const ref of analysis.references) {
        try {
          await fs.promises.access(ref.resolvedPath);
        } catch (error) {
          brokenLinks.push({
            file: analysis.path,
            reference: ref,
            error: 'File not found'
          });
        }
      }
    }

    return brokenLinks;
  }

  /**
   * Find outdated files based on last modified date and content
   * @param {Array} analyses - File analyses
   * @returns {Array} Outdated files
   */
  findOutdatedFiles(analyses) {
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

    return analyses.filter(analysis => {
      return analysis.lastModified < sixMonthsAgo && 
             analysis.wordCount < 100 &&
             !analysis.name.toLowerCase().includes('readme');
    }).map(analysis => ({
      path: analysis.path,
      reason: 'old_and_minimal',
      lastModified: analysis.lastModified,
      wordCount: analysis.wordCount
    }));
  }

  /**
   * Generate recommendations for markdown cleanup
   * @param {Array} analyses - File analyses
   * @param {Array} unusedFiles - Unused files
   * @param {Array} brokenLinks - Broken links
   * @param {Array} outdatedFiles - Outdated files
   * @returns {Object} Recommendations
   */
  generateMarkdownRecommendations(analyses, unusedFiles, brokenLinks, outdatedFiles) {
    const recommendations = {
      filesToRemove: [],
      linksToFix: [],
      filesToUpdate: [],
      priority: {
        high: [],
        medium: [],
        low: []
      }
    };

    // Files to remove
    unusedFiles.forEach(file => {
      recommendations.filesToRemove.push({
        path: file.path,
        reason: file.reason,
        action: 'remove',
        safety: file.reason === 'empty_or_minimal' ? 'safe' : 'review_required'
      });
    });

    // Links to fix
    brokenLinks.forEach(broken => {
      recommendations.linksToFix.push({
        file: broken.file,
        issue: broken.link || broken.reference,
        action: 'fix_or_remove',
        priority: 'medium'
      });
    });

    // Files to update
    outdatedFiles.forEach(file => {
      recommendations.filesToUpdate.push({
        path: file.path,
        reason: file.reason,
        action: 'review_and_update_or_remove',
        lastModified: file.lastModified
      });
    });

    // Prioritize recommendations
    recommendations.priority.high = brokenLinks.map(b => ({
      type: 'broken_link',
      file: b.file,
      description: `Fix broken link: ${b.link?.url || b.reference?.fileName}`
    }));

    recommendations.priority.medium = [
      ...unusedFiles.filter(f => f.reason === 'not_referenced').map(f => ({
        type: 'unused_file',
        file: f.path,
        description: `Review unused file: ${f.path}`
      })),
      ...outdatedFiles.map(f => ({
        type: 'outdated_file',
        file: f.path,
        description: `Review outdated file: ${f.path}`
      }))
    ];

    recommendations.priority.low = unusedFiles.filter(f => f.reason === 'empty_or_minimal').map(f => ({
      type: 'empty_file',
      file: f.path,
      description: `Remove empty/minimal file: ${f.path}`
    }));

    return recommendations;
  }
}

module.exports = MarkdownAnalyzer;