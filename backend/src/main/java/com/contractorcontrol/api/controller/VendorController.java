package com.contractorcontrol.api.controller;

import com.contractorcontrol.api.entity.AdmissionEntity;
import com.contractorcontrol.api.entity.ComplianceItemEntity;
import com.contractorcontrol.api.entity.VendorEntity;
import com.contractorcontrol.api.repository.AdmissionRepository;
import com.contractorcontrol.api.repository.ComplianceItemRepository;
import com.contractorcontrol.api.repository.VendorRepository;
import com.contractorcontrol.api.util.ApiConstants;
import com.contractorcontrol.api.util.ApiSerializers;
import com.contractorcontrol.api.util.ValidationUtils;
import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.NoSuchElementException;
import java.util.UUID;
import java.util.stream.Collectors;
import org.springframework.data.domain.Sort;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/vendors")
public class VendorController {

  private final VendorRepository vendorRepository;
  private final AdmissionRepository admissionRepository;
  private final ComplianceItemRepository complianceItemRepository;

  public VendorController(VendorRepository vendorRepository,
      AdmissionRepository admissionRepository,
      ComplianceItemRepository complianceItemRepository) {
    this.vendorRepository = vendorRepository;
    this.admissionRepository = admissionRepository;
    this.complianceItemRepository = complianceItemRepository;
  }

  @GetMapping
  public List<Map<String, Object>> list(
      @RequestParam(required = false) String keyword,
      @RequestParam(required = false) String status) {
    Specification<VendorEntity> specification = Specification.where(null);
    if (status != null && !status.isEmpty()) {
      specification = specification.and((root, query, cb) -> cb.equal(root.get("status"), status));
    }
    if (keyword != null && !keyword.trim().isEmpty()) {
      String like = "%" + keyword.trim() + "%";
      specification = specification.and((root, query, cb) -> cb.or(
          cb.like(root.get("name"), like),
          cb.like(root.get("creditCode"), like),
          cb.like(root.get("contactName"), like)));
    }
    return vendorRepository.findAll(specification, Sort.by(Sort.Direction.DESC, "createdAt"))
        .stream()
        .map(ApiSerializers::serializeVendor)
        .collect(Collectors.toList());
  }

  @GetMapping("/{id}")
  public Map<String, Object> detail(@PathVariable String id) {
    VendorEntity vendor = vendorRepository.findById(id).orElseThrow(() -> new NoSuchElementException("服务商不存在"));
    return ApiSerializers.serializeVendor(vendor);
  }

  @GetMapping("/{id}/detail")
  public Map<String, Object> fullDetail(@PathVariable String id) {
    VendorEntity vendor = vendorRepository.findById(id).orElseThrow(() -> new NoSuchElementException("服务商不存在"));

    List<AdmissionEntity> admissions = admissionRepository.findByVendorId(id);

    java.util.Set<String> involvedProjectIds = admissions.stream()
        .filter(a -> "approved".equals(a.getStatus()))
        .map(a -> a.getProject().getId())
        .collect(java.util.stream.Collectors.toSet());

    List<ComplianceItemEntity> scopedItems = complianceItemRepository.findByVendorId(id).stream()
        .filter(item -> item.getProject() != null && involvedProjectIds.contains(item.getProject().getId()))
        .collect(Collectors.toList());

    Instant now = Instant.now();
    Instant in30Days = now.plus(30, ChronoUnit.DAYS);
    List<ComplianceItemEntity> expiredItems = scopedItems.stream()
        .filter(item -> item.getExpiryDate().isBefore(now))
        .collect(Collectors.toList());
    List<ComplianceItemEntity> expiringSoonItems = scopedItems.stream()
        .filter(item -> !item.getExpiryDate().isBefore(now) && !item.getExpiryDate().isAfter(in30Days))
        .collect(Collectors.toList());

    String performanceStatus = computePerformanceStatus(vendor, admissions, expiredItems, expiringSoonItems);

    LinkedHashMap<String, Object> data = new LinkedHashMap<String, Object>();
    data.put("vendor", ApiSerializers.serializeVendor(vendor));
    data.put("admissions", admissions.stream()
        .map(a -> {
          LinkedHashMap<String, Object> adm = new LinkedHashMap<String, Object>();
          adm.put("id", a.getId());
          adm.put("projectId", a.getProject().getId());
          adm.put("projectCode", a.getProject().getCode());
          adm.put("projectName", a.getProject().getName());
          adm.put("projectStatus", a.getProject().getStatus());
          adm.put("applyDate", ApiSerializers.formatInstant(a.getApplyDate()));
          adm.put("plannedEntryDate", ApiSerializers.formatInstant(a.getPlannedEntryDate()));
          adm.put("scopeOfWork", a.getScopeOfWork());
          adm.put("status", a.getStatus());
          adm.put("reviewComment", a.getReviewComment());
          adm.put("reviewedBy", a.getReviewedBy());
          adm.put("reviewedAt", ApiSerializers.formatInstant(a.getReviewedAt()));
          return adm;
        })
        .collect(Collectors.toList()));
    data.put("expiredComplianceItems", expiredItems.stream().map(ApiSerializers::serializeComplianceItem).collect(Collectors.toList()));
    data.put("expiringSoonComplianceItems", expiringSoonItems.stream().map(ApiSerializers::serializeComplianceItem).collect(Collectors.toList()));
    data.put("performanceStatus", performanceStatus);
    return data;
  }

  private String computePerformanceStatus(VendorEntity vendor,
      List<AdmissionEntity> admissions,
      List<ComplianceItemEntity> expiredItems,
      List<ComplianceItemEntity> expiringSoonItems) {
    if (!"active".equals(vendor.getStatus())) {
      return "inactive";
    }
    if (!expiredItems.isEmpty()) {
      return "at_risk";
    }
    if (!expiringSoonItems.isEmpty()) {
      return "warning";
    }
    return "normal";
  }

  @PostMapping
  @org.springframework.web.bind.annotation.ResponseStatus(HttpStatus.CREATED)
  public Map<String, Object> create(@RequestBody(required = false) Map<String, Object> body) {
    return ApiSerializers.serializeVendor(saveVendor(new VendorEntity(), body, true));
  }

  @PutMapping("/{id}")
  public Map<String, Object> update(@PathVariable String id, @RequestBody(required = false) Map<String, Object> body) {
    VendorEntity vendor = vendorRepository.findById(id).orElseThrow(() -> new NoSuchElementException("服务商不存在"));
    return ApiSerializers.serializeVendor(saveVendor(vendor, body, false));
  }

  private VendorEntity saveVendor(VendorEntity vendor, Map<String, Object> body, boolean create) {
    Map<String, Object> payload = body == null ? java.util.Collections.<String, Object>emptyMap() : body;
    if (create) {
      vendor.setId(UUID.randomUUID().toString().replace("-", ""));
      vendor.setCreatedAt(Instant.now());
    }
    vendor.setName(ValidationUtils.assertString(payload.get("name"), "name"));
    vendor.setCreditCode(ValidationUtils.assertString(payload.get("creditCode"), "creditCode"));
    vendor.setServiceType(ValidationUtils.assertString(payload.get("serviceType"), "serviceType"));
    vendor.setContactName(ValidationUtils.assertString(payload.get("contactName"), "contactName"));
    vendor.setContactPhone(ValidationUtils.assertString(payload.get("contactPhone"), "contactPhone"));
    vendor.setStatus(ValidationUtils.assertEnum(payload.get("status"), ApiConstants.VENDOR_STATUSES, "status"));
    vendor.setRemark(ValidationUtils.assertOptionalString(payload.get("remark")));
    return vendorRepository.save(vendor);
  }
}
