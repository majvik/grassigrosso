'use strict';

const path = require('node:path');
const { generateUploadResponsiveVariants } = require('./responsive-upload');

function extendUploadPlugin(plugin, options = {}) {
  const generate = options.generate || generateUploadResponsiveVariants;
  const publicDir = options.publicDir || path.resolve(process.cwd(), 'public');
  const logger = options.logger || strapi.log;
  const decorateResult = async (result) => {
    const files = (Array.isArray(result) ? result : [result]).filter(Boolean);
    for (const file of files) {
      try {
        const variants = await generate({ file, publicDir });
        if (variants.generated.length) {
          logger.info(`Responsive media: generated ${variants.generated.length} variants for ${file.name || file.url}`);
        }
        if (variants.skipped.length) {
          logger.warn(`Responsive media: ${file.name || file.url} is too small for slots: ${variants.skipped.join(', ')}`);
        }
      } catch (error) {
        logger.error(`Responsive media generation failed for ${file.name || file.url}: ${error.message}`);
      }
    }
    return result;
  };

  function decorateService(service) {
    const { upload, replace } = service;
    service.upload = async function responsiveUpload(...args) {
      return decorateResult(await upload.apply(this, args));
    };
    service.replace = async function responsiveReplace(...args) {
      return decorateResult(await replace.apply(this, args));
    };
    return service;
  }

  const uploadFactory = plugin.services.upload;
  plugin.services.upload = typeof uploadFactory === 'function'
    ? function createResponsiveUploadService(...args) {
      return decorateService(uploadFactory.apply(this, args));
    }
    : decorateService(uploadFactory);
  return plugin;
}

module.exports = extendUploadPlugin;
module.exports.extendUploadPlugin = extendUploadPlugin;
